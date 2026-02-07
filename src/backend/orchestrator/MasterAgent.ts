/**
 * Master Agent: spawns sub-agent tasks, parallel execution via BullMQ task queue.
 */

import { randomUUID } from "node:crypto";
import {
  enqueueTask,
  enqueueTasks,
  getTaskQueue,
  type TaskPayload,
  type TaskResult,
} from "../queue/task-queue";
import type { SpawnTaskInput, SpawnResult, SpawnParallelOptions, WaitResult } from "./types";
import { QueueError, withTimeout, getErrorMessage } from "@/utils/errors";

/** Default timeout for waiting on jobs (5 minutes) */
const DEFAULT_WAIT_TIMEOUT_MS = 300000;

/**
 * Master Agent: delegates work to sub-agents via a BullMQ task queue.
 * - Sub-agent spawning: enqueue tasks with agentType + input.
 * - Parallel execution: worker concurrency processes multiple jobs in parallel.
 * - Retry + failure handling: configured on the queue (attempts, backoff); failed jobs can be observed via queue events.
 */
export class MasterAgent {
  constructor(
    /** Optional parent task id for tracing */
    public readonly parentTaskId?: string
  ) {}

  /**
   * Spawn a single sub-agent task. Returns immediately with task/job ids.
   * @throws QueueError if enqueueing fails
   */
  async spawn(input: SpawnTaskInput): Promise<SpawnResult> {
    const taskId = input.taskId ?? randomUUID();
    const payload: TaskPayload = {
      taskId,
      agentType: input.agentType,
      input: input.input,
      parentTaskId: input.parentTaskId ?? this.parentTaskId,
      priority: input.priority,
    };

    try {
      const job = await enqueueTask(payload, {
        delay: input.delay,
        priority: input.priority,
        jobId: taskId,
      });
      return { taskId, jobId: job.id ?? taskId };
    } catch (err) {
      throw new QueueError(
        `Failed to spawn task ${taskId}: ${getErrorMessage(err)}`,
        err instanceof Error ? err : undefined,
        "spawn"
      );
    }
  }

  /**
   * Spawn multiple sub-agent tasks in one batch. Jobs are processed in parallel up to worker concurrency.
   * @throws QueueError if bulk enqueueing fails
   */
  async spawnParallel(
    inputs: SpawnTaskInput[],
    opts?: SpawnParallelOptions
  ): Promise<SpawnResult[]> {
    if (inputs.length === 0) {
      return [];
    }

    const payloads: TaskPayload[] = inputs.map((input) => ({
      taskId: input.taskId ?? randomUUID(),
      agentType: input.agentType,
      input: input.input,
      parentTaskId: input.parentTaskId ?? this.parentTaskId,
      priority: input.priority ?? opts?.priority,
    }));

    try {
      const jobs = await enqueueTasks(payloads, {
        delay: opts?.delay,
        priority: opts?.priority,
      });
      return jobs.map((job: { id?: string }, i: number) => ({
        taskId: payloads[i]!.taskId,
        jobId: job.id ?? payloads[i]!.taskId,
      }));
    } catch (err) {
      throw new QueueError(
        `Failed to spawn ${inputs.length} parallel tasks: ${getErrorMessage(err)}`,
        err instanceof Error ? err : undefined,
        "spawnParallel"
      );
    }
  }

  /**
   * Wait for a single job by id (poll or getJob). Returns the job's return value or throws.
   * @param jobId - The job ID to wait for
   * @param timeoutMs - Maximum time to wait in milliseconds (default: 5 minutes)
   * @throws QueueError if job not found or queue operation fails
   * @throws TimeoutError if wait exceeds timeout
   */
  async waitForJob(jobId: string, timeoutMs: number = DEFAULT_WAIT_TIMEOUT_MS): Promise<TaskResult> {
    const doWait = async (): Promise<TaskResult> => {
      let queue;
      try {
        queue = getTaskQueue();
      } catch (err) {
        throw new QueueError(
          `Failed to get queue for job ${jobId}: ${getErrorMessage(err)}`,
          err instanceof Error ? err : undefined,
          "waitForJob"
        );
      }

      const job = await queue.getJob(jobId);
      if (!job) {
        throw new QueueError(
          `Job not found: ${jobId}`,
          undefined,
          "waitForJob"
        );
      }

      const state = await job.getState();
      if (state === "completed") {
        return job.returnvalue as TaskResult;
      }
      if (state === "failed") {
        const failedReason = job.failedReason ?? "Unknown failure";
        return {
          taskId: job.data.taskId,
          success: false,
          error: failedReason,
        };
      }

      try {
        const result = await job.waitUntilFinished((queue as any).events);
        return result as TaskResult;
      } catch (err) {
        // Job may have failed while waiting
        const latestState = await job.getState();
        if (latestState === "failed") {
          return {
            taskId: job.data.taskId,
            success: false,
            error: job.failedReason ?? getErrorMessage(err),
          };
        }
        throw new QueueError(
          `Error waiting for job ${jobId}: ${getErrorMessage(err)}`,
          err instanceof Error ? err : undefined,
          "waitForJob"
        );
      }
    };

    return withTimeout(doWait, timeoutMs, `Wait for job ${jobId}`);
  }

  /**
   * Wait for multiple jobs. Returns aggregated results (completed + failed).
   * @param jobIds - Array of job IDs to wait for
   * @param timeoutMs - Maximum time to wait for all jobs in milliseconds (default: 5 minutes)
   * @throws TimeoutError if wait exceeds timeout
   */
  async waitForJobs(
    jobIds: string[],
    timeoutMs: number = DEFAULT_WAIT_TIMEOUT_MS
  ): Promise<WaitResult> {
    if (jobIds.length === 0) {
      return { results: [], completed: [], failed: [] };
    }

    const doWaitAll = async (): Promise<WaitResult> => {
      let queue;
      try {
        queue = getTaskQueue();
      } catch (err) {
        throw new QueueError(
          `Failed to get queue for waiting on jobs: ${getErrorMessage(err)}`,
          err instanceof Error ? err : undefined,
          "waitForJobs"
        );
      }

      const results: TaskResult[] = [];
      const completed: TaskResult[] = [];
      const failed: TaskResult[] = [];

      await Promise.all(
        jobIds.map(async (id) => {
          try {
            const job = await queue.getJob(id);
            if (!job) {
              const errorResult: TaskResult = {
                taskId: id,
                success: false,
                error: "Job not found",
              };
              results.push(errorResult);
              failed.push(errorResult);
              return;
            }

            const state = await job.getState();
            if (state === "completed") {
              const r = job.returnvalue as TaskResult;
              results.push(r);
              completed.push(r);
              return;
            }
            if (state === "failed") {
              const r: TaskResult = {
                taskId: job.data.taskId,
                success: false,
                error: job.failedReason ?? "Unknown failure",
              };
              results.push(r);
              failed.push(r);
              return;
            }

            try {
              const result = (await job.waitUntilFinished((queue as any).events)) as TaskResult;
              results.push(result);
              if (result.success) completed.push(result);
              else failed.push(result);
            } catch (waitErr) {
              // Job may have failed while waiting
              const latestState = await job.getState();
              if (latestState === "failed" || latestState === "completed") {
                const r: TaskResult = latestState === "completed"
                  ? (job.returnvalue as TaskResult)
                  : {
                      taskId: job.data.taskId,
                      success: false,
                      error: job.failedReason ?? getErrorMessage(waitErr),
                    };
                results.push(r);
                if (r.success) completed.push(r);
                else failed.push(r);
              } else {
                // Still active but error occurred
                const errorResult: TaskResult = {
                  taskId: job.data.taskId,
                  success: false,
                  error: `Wait error: ${getErrorMessage(waitErr)}`,
                };
                results.push(errorResult);
                failed.push(errorResult);
              }
            }
          } catch (err) {
            // Error getting job state
            const errorResult: TaskResult = {
              taskId: id,
              success: false,
              error: `Queue error: ${getErrorMessage(err)}`,
            };
            results.push(errorResult);
            failed.push(errorResult);
          }
        })
      );

      return { results, completed, failed };
    };

    return withTimeout(doWaitAll, timeoutMs, `Wait for ${jobIds.length} jobs`);
  }
}
