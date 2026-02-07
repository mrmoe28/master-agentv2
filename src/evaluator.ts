import { chatJson } from "./llm/client";
import type { ChatMessage } from "./llm/client";
import type { EvaluationResult, Plan } from "./agent-types";
import { getTaskResultsSummary, getRecentContext } from "./memory";
import type { AgentMemory } from "./agent-types";
import { z } from "zod";
import { EvaluationError, LLMError, LLMParseError, getErrorMessage } from "@/utils/errors";

const EvaluationSchema = z.object({
  success: z.boolean(),
  score: z.number().min(0).max(10),
  reasoning: z.string(),
  failedTaskIds: z.array(z.string()),
  shouldRetry: z.boolean(),
  retrySuggestions: z.string().optional(),
});

/**
 * Evaluate whether the goal was achieved based on task results.
 * Returns a default retry evaluation if LLM evaluation fails.
 */
export async function evaluate(
  goalDescription: string,
  plan: Plan,
  memory: AgentMemory
): Promise<EvaluationResult> {
  const resultsSummary = getTaskResultsSummary(memory);
  const context = getRecentContext(memory, 20);

  const system: ChatMessage = {
    role: "system",
    content: `You are an evaluator. Given the goal, plan, and task results, decide if the goal was achieved and whether to retry.

Output JSON: { "success": boolean, "score": 0-10, "reasoning": "...", "failedTaskIds": ["task_1", ...], "shouldRetry": boolean, "retrySuggestions": "optional what to fix" }
- success: true only if all critical tasks succeeded and goal is met.
- shouldRetry: true if some tasks failed or outcome is incomplete and retries remain.`,
  };

  const user: ChatMessage = {
    role: "user",
    content: `Goal: ${goalDescription}

Plan reasoning: ${plan.reasoning}
Tasks: ${plan.tasks.map((t) => `${t.id}: ${t.description}`).join("; ")}

Task results:
${resultsSummary}

${context ? `Recent context:\n${context}` : ""}

Evaluate and output JSON.`,
  };

  try {
    const evalResult = await chatJson([system, user], EvaluationSchema);
    return evalResult as EvaluationResult;
  } catch (err) {
    const errorMsg = getErrorMessage(err);

    // Log the error for debugging
    console.error(`[Evaluator] Evaluation failed: ${errorMsg}`);

    // Determine if this is a retryable error
    const isRetryable =
      (err instanceof LLMError && err.retryable) ||
      err instanceof LLMParseError;

    if (!isRetryable) {
      // For non-retryable errors, throw wrapped error
      throw new EvaluationError(
        `Evaluation failed: ${errorMsg}`,
        err instanceof Error ? err : undefined
      );
    }

    // For retryable errors, return a conservative default that suggests retry
    // This allows the agent to continue and try again in the next iteration
    console.warn("[Evaluator] Returning default retry evaluation due to error");

    // Extract failed task IDs from memory if possible
    const taskResults = memory.entries.filter((e) => e.taskId);
    const failedTaskIds = taskResults
      .filter((e) => e.content.toLowerCase().includes("fail") || e.content.toLowerCase().includes("error"))
      .map((e) => e.taskId)
      .filter((id): id is string => id !== undefined);

    return {
      success: false,
      score: 3, // Low score to indicate uncertainty
      reasoning: `Evaluation could not be completed due to error: ${errorMsg}. Suggesting retry.`,
      failedTaskIds: [...new Set(failedTaskIds)],
      shouldRetry: true,
      retrySuggestions: "Automatic retry due to evaluation error",
    };
  }
}
