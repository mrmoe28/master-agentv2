/**
 * Orchestrator types: master agent, sub-agents, task flow.
 */

import type { TaskPayload, TaskResult } from "../queue/types.js";

/** Sub-agent contract: run(input) => output */
export interface ISubAgent {
  readonly type: string;
  run(input: unknown): Promise<unknown>;
}

/** Input for spawning a sub-task from the master */
export interface SpawnTaskInput {
  agentType: string;
  input: unknown;
  /** Optional; set by orchestrator if not provided */
  taskId?: string;
  parentTaskId?: string;
  priority?: number;
  /** Delay in ms before job is processed */
  delay?: number;
}

/** Result of spawning (job id / task id) */
export interface SpawnResult {
  taskId: string;
  jobId: string;
}

/** Options for parallel spawn (multiple sub-tasks) */
export interface SpawnParallelOptions {
  /** Max concurrency for the worker processing these jobs (configured on worker) */
  priority?: number;
  delay?: number;
}

/** Aggregated result from waiting on multiple jobs */
export interface WaitResult {
  results: TaskResult[];
  failed: TaskResult[];
  completed: TaskResult[];
}
