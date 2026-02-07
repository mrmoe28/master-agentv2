/**
 * BullMQ task queue: add jobs with retry, backoff, and failure handling.
 */

import { Queue, type ConnectionOptions } from "bullmq";
import {
  QUEUE_NAME,
  type TaskPayload,
  DEFAULT_JOB_OPTS,
  type TaskResult,
} from "./types";
import { QueueError, getErrorMessage } from "@/utils/errors";

const defaultConnection: ConnectionOptions = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
  password: process.env.REDIS_PASSWORD ?? undefined,
  maxRetriesPerRequest: null,
};

let queueInstance: Queue<TaskPayload, TaskResult> | null = null;
let connectionHealthy = true;

/**
 * Get or create the BullMQ queue. Uses REDIS_* env for connection.
 * @throws QueueError if queue creation fails
 */
export function getTaskQueue(connection?: ConnectionOptions): Queue<TaskPayload, TaskResult> {
  if (!queueInstance) {
    try {
      queueInstance = new Queue<TaskPayload, TaskResult>(QUEUE_NAME, {
        connection: connection ?? defaultConnection,
        defaultJobOptions: {
          ...DEFAULT_JOB_OPTS,
        },
      });

      // Set up error handling on the queue
      queueInstance.on("error", (err) => {
        console.error("[TaskQueue] Queue error:", err.message);
        connectionHealthy = false;
      });

      // Log when connection is restored (queue will emit 'ready' or similar)
      // Note: BullMQ Queue doesn't have a 'ready' event, but we can check on operations
    } catch (err) {
      throw new QueueError(
        `Failed to create task queue: ${getErrorMessage(err)}`,
        err instanceof Error ? err : undefined,
        "getTaskQueue"
      );
    }
  }
  return queueInstance;
}

/**
 * Check if the queue connection appears healthy.
 */
export function isQueueHealthy(): boolean {
  return connectionHealthy && queueInstance !== null;
}

/**
 * Close the queue connection gracefully.
 */
export async function closeQueue(): Promise<void> {
  if (queueInstance) {
    try {
      await queueInstance.close();
      queueInstance = null;
      connectionHealthy = true;
    } catch (err) {
      console.error("[TaskQueue] Error closing queue:", getErrorMessage(err));
    }
  }
}

/**
 * Enqueue a single task. Returns the BullMQ Job.
 * @throws QueueError if enqueueing fails
 */
export async function enqueueTask(
  payload: TaskPayload,
  opts?: { delay?: number; priority?: number; jobId?: string }
) {
  const q = getTaskQueue();

  try {
    const job = await q.add(
      payload.agentType,
      payload,
      {
        jobId: opts?.jobId ?? payload.taskId,
        delay: opts?.delay,
        priority: opts?.priority ?? payload.priority,
      }
    );
    connectionHealthy = true; // Successful operation means connection is good
    return job;
  } catch (err) {
    connectionHealthy = false;
    throw new QueueError(
      `Failed to enqueue task ${payload.taskId}: ${getErrorMessage(err)}`,
      err instanceof Error ? err : undefined,
      "enqueueTask"
    );
  }
}

/**
 * Enqueue multiple tasks. Jobs run in parallel up to worker concurrency.
 * @throws QueueError if bulk enqueueing fails
 */
export async function enqueueTasks(
  payloads: TaskPayload[],
  opts?: { delay?: number; priority?: number }
) {
  if (payloads.length === 0) {
    return [];
  }

  const q = getTaskQueue();

  try {
    const jobs = await q.addBulk(
      payloads.map((p) => ({
        name: p.agentType,
        data: p,
        opts: {
          jobId: p.taskId,
          delay: opts?.delay,
          priority: opts?.priority ?? p.priority,
        },
      }))
    );
    connectionHealthy = true;
    return jobs;
  } catch (err) {
    connectionHealthy = false;
    throw new QueueError(
      `Failed to enqueue ${payloads.length} tasks: ${getErrorMessage(err)}`,
      err instanceof Error ? err : undefined,
      "enqueueTasks"
    );
  }
}

export type { TaskPayload, TaskResult };
