/**
 * BullMQ worker: processes tasks with concurrency, retry, and failure handling.
 * Run: npm run backend:worker:dev (or backend:worker after build).
 */

import { Worker, type ConnectionOptions } from "bullmq";
import { QUEUE_NAME, type TaskPayload, type TaskResult } from "./types";
import { processTask } from "./processor";
import { registerSubAgent } from "../orchestrator/sub-agents";
import { EchoSubAgent } from "../orchestrator/EchoSubAgent";
import { getErrorMessage } from "@/utils/errors";

// Register default sub-agents
registerSubAgent(new EchoSubAgent());

const defaultConnection: ConnectionOptions = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
  password: process.env.REDIS_PASSWORD ?? undefined,
  maxRetriesPerRequest: null,
};

const concurrency = parseInt(process.env.WORKER_CONCURRENCY ?? "5", 10);

let isShuttingDown = false;

const worker = new Worker<TaskPayload, TaskResult>(
  QUEUE_NAME,
  async (job: { data: TaskPayload }) => {
    if (isShuttingDown) {
      throw new Error("Worker is shutting down");
    }
    return processTask(job);
  },
  {
    connection: defaultConnection,
    concurrency,
    limiter: process.env.WORKER_RATE_LIMIT_MAX
      ? {
          max: parseInt(process.env.WORKER_RATE_LIMIT_MAX, 10),
          duration: parseInt(process.env.WORKER_RATE_LIMIT_DURATION ?? "1000", 10),
        }
      : undefined,
  }
);

// Job completed event
worker.on("completed", (job: { id?: string; data: TaskPayload }, result: TaskResult) => {
  console.log(`[worker] completed job ${job.id} (${job.data.taskId}): success=${result.success}`);
});

// Job failed event
worker.on("failed", (job: { id?: string; data: TaskPayload } | undefined, err: Error) => {
  console.error(`[worker] failed job ${job?.id} (${job?.data?.taskId}):`, err.message);
});

// Worker-level error event (connection issues, etc.)
worker.on("error", (err: Error) => {
  console.error("[worker] error:", getErrorMessage(err));
});

// Stalled job event (job took too long and was considered stuck)
worker.on("stalled", (jobId: string) => {
  console.warn(`[worker] job stalled: ${jobId}`);
});

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    console.log(`[worker] Already shutting down, ignoring ${signal}`);
    return;
  }

  isShuttingDown = true;
  console.log(`[worker] Received ${signal}, shutting down gracefully...`);

  try {
    // Close the worker, waiting for active jobs to complete
    await worker.close();
    console.log("[worker] Worker closed successfully");
  } catch (err) {
    console.error("[worker] Error during shutdown:", getErrorMessage(err));
  }

  process.exit(0);
}

// Handle termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions at the process level
process.on("uncaughtException", (err: Error) => {
  console.error("[worker] Uncaught exception:", getErrorMessage(err));
  // Log but don't exit - let the worker try to recover
});

process.on("unhandledRejection", (reason: unknown) => {
  console.error("[worker] Unhandled rejection:", getErrorMessage(reason));
  // Log but don't exit - let the worker try to recover
});

console.log(`[worker] started, concurrency=${concurrency}`);
