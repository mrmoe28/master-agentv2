import type { AgentMemory, MemoryEntry, TaskResult } from "./agent-types.js";

export function createMemory(goalId: string): AgentMemory {
  return {
    goalId,
    entries: [],
    taskResults: new Map(),
  };
}

export function addMemoryEntry(
  memory: AgentMemory,
  entry: Omit<MemoryEntry, "timestamp">
): void {
  memory.entries.push({
    ...entry,
    timestamp: new Date().toISOString(),
  });
}

export function recordTaskResult(memory: AgentMemory, result: TaskResult): void {
  memory.taskResults.set(result.taskId, result);
  addMemoryEntry(memory, {
    type: "task_result",
    taskId: result.taskId,
    content: result.success
      ? `Task ${result.taskId} succeeded: ${result.output}`
      : `Task ${result.taskId} failed: ${result.error ?? result.output}`,
    metadata: {
      success: result.success,
      toolCalls: result.toolCalls?.length ?? 0,
    },
  });
}

export function getRecentContext(memory: AgentMemory, lastN = 20): string {
  const slice = memory.entries.slice(-lastN);
  return slice
    .map((e) => `[${e.type}]${e.taskId ? ` (${e.taskId})` : ""}: ${e.content}`)
    .join("\n");
}

export function getCompletedTaskIds(memory: AgentMemory): string[] {
  return Array.from(memory.taskResults.keys());
}

export function getTaskResultsSummary(memory: AgentMemory): string {
  const lines: string[] = [];
  for (const [taskId, r] of memory.taskResults) {
    lines.push(
      `- ${taskId}: ${r.success ? "OK" : "FAIL"} ${r.output?.slice(0, 100) ?? ""}`
    );
  }
  return lines.join("\n");
}
