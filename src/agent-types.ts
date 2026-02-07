import { z } from "zod";

// --- Goal & Plan ---
export interface Goal {
  id: string;
  description: string;
  createdAt: string;
}

export const TaskSchema = z.object({
  id: z.string(),
  description: z.string(),
  toolHint: z.string().optional(),
  dependsOn: z.array(z.string()).optional(),
  reasoning: z.string().optional(),
});

export type Task = z.infer<typeof TaskSchema>;

export const PlanSchema = z.object({
  reasoning: z.string(),
  tasks: z.array(TaskSchema),
});

export type Plan = z.infer<typeof PlanSchema>;

// --- Execution ---
export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
  reasoning?: string;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  output: string;
  toolCalls: ToolCall[];
  error?: string;
  durationMs?: number;
}

// --- Memory ---
export interface MemoryEntry {
  type: "task_result" | "observation" | "plan";
  taskId?: string;
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AgentMemory {
  goalId: string;
  entries: MemoryEntry[];
  taskResults: Map<string, TaskResult>;
}

// --- Evaluation ---
export interface EvaluationResult {
  success: boolean;
  score: number;
  reasoning: string;
  failedTaskIds: string[];
  shouldRetry: boolean;
  retrySuggestions?: string;
}

// --- Tools ---
export interface ToolDef {
  name: string;
  description: string;
  parameters: z.ZodObject<Record<string, z.ZodTypeAny>>;
  execute: (args: unknown) => Promise<string>;
}

// --- Agent state ---
export interface AgentState {
  goal: Goal;
  plan: Plan | null;
  memory: AgentMemory;
  currentTaskIndex: number;
  maxRetries: number;
  retryCount: number;
  iteration: number;
  maxIterations: number;
}
