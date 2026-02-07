/**
 * Task queue types for BullMQ.
 */

export const QUEUE_NAME = "master-agent-tasks" as const;

export interface TaskPayload {
  /** Unique task id */
  taskId: string;
  /** Sub-agent type / handler key */
  agentType: string;
  /** Input for the sub-agent */
  input: unknown;
  /** Optional parent task id for tracing */
  parentTaskId?: string;
  /** Optional priority (higher = more urgent) */
  priority?: number;
  /** Optional metadata */
  meta?: Record<string, unknown>;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  output?: unknown;
  error?: string;
  durationMs?: number;
}

/** Default job options: retry with exponential backoff */
export const DEFAULT_JOB_OPTS = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 1000,
  },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
} as const;
