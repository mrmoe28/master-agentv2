/**
 * Job processor: maps agentType to handler and runs it. Used by the worker.
 */

import type { TaskPayload, TaskResult } from "./types.js";
import { getSubAgentRegistry } from "../orchestrator/sub-agents.js";

export async function processTask(job: { data: TaskPayload }): Promise<TaskResult> {
  const { taskId, agentType, input } = job.data;
  const start = Date.now();

  try {
    const registry = getSubAgentRegistry();
    const handler = registry.get(agentType);
    if (!handler) {
      return {
        taskId,
        success: false,
        error: `Unknown agent type: ${agentType}`,
        durationMs: Date.now() - start,
      };
    }

    const output = await handler.run(input);
    return {
      taskId,
      success: true,
      output,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return {
      taskId,
      success: false,
      error,
      durationMs: Date.now() - start,
    };
  }
}
