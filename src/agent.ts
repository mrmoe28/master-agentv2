import type { Goal, Plan, Task, EvaluationResult } from "./agent-types";
import { createMemory, addMemoryEntry } from "./memory";
import { createPlan } from "./planner";
import { executeTask } from "./executor";
import { evaluate } from "./evaluator";
import { PlanningError, EvaluationError, getErrorMessage } from "@/utils/errors";
import { addRAGDocument } from "@/backend";

const DEFAULT_MAX_ITERATIONS = 5;

function createGoal(description: string): Goal {
  return {
    id: `goal_${Date.now()}`,
    description,
    createdAt: new Date().toISOString(),
  };
}

function topologicalSort(tasks: Task[]): Task[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const visited = new Set<string>();
  const result: Task[] = [];

  function visit(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    const task = byId.get(id);
    if (!task) return;
    for (const dep of task.dependsOn ?? []) visit(dep);
    result.push(task);
  }

  for (const t of tasks) visit(t.id);
  return result;
}

export interface RunResult {
  success: boolean;
  plan: Plan | null;
  taskResults: Array<{ taskId: string; success: boolean; output: string }>;
  evaluation: EvaluationResult | null;
  iterations: number;
  finalReport?: string;
  errors?: string[];
}

export async function runAutonomousAgent(
  goalDescription: string,
  options?: { maxIterations?: number; maxRetries?: number }
): Promise<RunResult> {
  const goal = createGoal(goalDescription);
  const memory = createMemory(goal.id);
  const maxIterations = options?.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const errors: string[] = [];

  addMemoryEntry(memory, { type: "plan", content: `Goal: ${goalDescription}` });

  let plan: Plan | null = null;
  let iteration = 0;
  let evaluation: EvaluationResult | null = null;
  const allTaskResults: RunResult["taskResults"] = [];

  while (iteration < maxIterations) {
    iteration++;
    console.log(`\n--- Iteration ${iteration} ---`);

    // Planning phase with error handling
    try {
      plan = await createPlan(goal, memory);
      addMemoryEntry(memory, {
        type: "plan",
        content: `Plan: ${plan.reasoning}. Tasks: ${plan.tasks.map((t) => t.id).join(", ")}`,
      });
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      console.error(`[Agent] Planning failed in iteration ${iteration}: ${errorMsg}`);
      errors.push(`Iteration ${iteration} planning error: ${errorMsg}`);

      addMemoryEntry(memory, {
        type: "observation",
        content: `Planning failed: ${errorMsg}`,
      });

      // If planning fails, try to continue with a minimal fallback plan
      if (err instanceof PlanningError && err.retryable && iteration < maxIterations) {
        console.log("[Agent] Retrying planning in next iteration...");
        continue;
      }

      // Cannot continue without a plan
      break;
    }

    // Validate plan has tasks
    if (!plan.tasks || plan.tasks.length === 0) {
      console.warn("[Agent] Plan has no tasks, skipping execution");
      errors.push(`Iteration ${iteration}: Plan generated with no tasks`);
      continue;
    }

    const ordered = topologicalSort(plan.tasks);

    // Execution phase with error handling per task
    for (const task of ordered) {
      console.log(`Executing: ${task.id} - ${task.description}`);
      try {
        const result = await executeTask(task, goal.description, memory);
        allTaskResults.push({
          taskId: result.taskId,
          success: result.success,
          output: result.output,
        });
        console.log(`  ${result.success ? "OK" : "FAIL"}: ${result.output.slice(0, 80)}...`);
      } catch (err) {
        const errorMsg = getErrorMessage(err);
        console.error(`[Agent] Task ${task.id} execution error: ${errorMsg}`);
        errors.push(`Task ${task.id} error: ${errorMsg}`);

        // Record failed task result
        allTaskResults.push({
          taskId: task.id,
          success: false,
          output: `Execution error: ${errorMsg}`,
        });

        addMemoryEntry(memory, {
          type: "observation",
          taskId: task.id,
          content: `Task failed with error: ${errorMsg}`,
        });
      }
    }

    // Evaluation phase with error handling
    try {
      evaluation = await evaluate(goal.description, plan, memory);
      console.log(
        `Evaluation: success=${evaluation.success} score=${evaluation.score} shouldRetry=${evaluation.shouldRetry}`
      );
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      console.error(`[Agent] Evaluation failed in iteration ${iteration}: ${errorMsg}`);
      errors.push(`Iteration ${iteration} evaluation error: ${errorMsg}`);

      // Provide a default evaluation that suggests retry
      evaluation = {
        success: false,
        score: 0,
        reasoning: `Evaluation failed: ${errorMsg}`,
        failedTaskIds: allTaskResults.filter((r) => !r.success).map((r) => r.taskId),
        shouldRetry: iteration < maxIterations,
        retrySuggestions: "Evaluation failed, retrying with updated context",
      };

      if (err instanceof EvaluationError) {
        addMemoryEntry(memory, {
          type: "observation",
          content: `Evaluation error: ${errorMsg}`,
        });
      }
    }

    if (evaluation.success || !evaluation.shouldRetry) break;
    if (evaluation.retrySuggestions) {
      addMemoryEntry(memory, {
        type: "observation",
        content: `Evaluator suggests retry: ${evaluation.retrySuggestions}`,
      });
    }
  }

  let finalReport: string | undefined;
  try {
    const { reportResults } = await import("./tools/report.js");
    finalReport = await reportResults();
  } catch (err) {
    const errorMsg = getErrorMessage(err);
    console.warn(`[Agent] Failed to generate final report: ${errorMsg}`);
  }

  // Persist run to long-term knowledge base for future planning
  try {
    const taskSummary = allTaskResults
      .map(
        (r) =>
          `${r.taskId}: ${r.success ? "OK" : "FAIL"} ${(r.output ?? "").slice(0, 80)}`
      )
      .join("; ");
    const memoryText = [
      `Goal: ${goalDescription}`,
      `Success: ${evaluation?.success ?? false}. Iterations: ${iteration}.`,
      `Tasks: ${taskSummary}`,
      evaluation?.reasoning ? `Evaluation: ${evaluation.reasoning}` : "",
      finalReport ? `Report: ${finalReport.slice(0, 300)}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    await addRAGDocument(memoryText, {
      type: "agent_run",
      goalId: goal.id,
      success: evaluation?.success ?? false,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn(
      "[Agent] Failed to persist run to long-term memory:",
      getErrorMessage(err)
    );
  }

  return {
    success: evaluation?.success ?? false,
    plan,
    taskResults: allTaskResults,
    evaluation,
    iterations: iteration,
    finalReport,
    ...(errors.length > 0 && { errors }),
  };
}
