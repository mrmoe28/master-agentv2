import { chatJson } from "./llm/client";
import type { ChatMessage } from "./llm/client";
import { PlanSchema, type Goal, type Plan } from "./agent-types";
import { getRecentContext } from "./memory";
import type { AgentMemory } from "./agent-types";
import { getToolsDescription } from "./tools/registry";
import { ragRetrieve } from "@/backend";
import { PlanningError, LLMError, LLMParseError, getErrorMessage } from "@/utils/errors";

/**
 * Create a plan for achieving the given goal.
 * @throws PlanningError if plan generation fails
 */
export async function createPlan(
  goal: Goal,
  memory: AgentMemory
): Promise<Plan> {
  const context = getRecentContext(memory, 30);
  const toolsDesc = getToolsDescription();

  let knowledgeContext = "";
  try {
    const past = await ragRetrieve(goal.description, { limit: 5 });
    if (past.length > 0) {
      knowledgeContext = past
        .map((r) => `- ${r.text}`)
        .join("\n");
    }
  } catch {
    // Continue without knowledge base if retrieval fails
  }

  const system: ChatMessage = {
    role: "system",
    content: `You are a planning agent. Given a user goal and optional recent context, produce a step-by-step plan as JSON.

Available tools (use toolHint to suggest which tool fits each task):
${toolsDesc}

Output JSON: { "reasoning": "your chain-of-thought reasoning", "tasks": [ { "id": "task_1", "description": "...", "toolHint": "parse_leads", "dependsOn": [], "reasoning": "why this step" }, ... ] }
- Use ids like task_1, task_2, ...
- Order tasks so dependencies come first (dependsOn lists prior task ids).
- For "organize leads, email them, schedule followups": parse leads first, then send emails, then schedule followups, then update CRM, then report.`,
  };

  const user: ChatMessage = {
    role: "user",
    content: `Goal: ${goal.description}

${context ? `Recent context:\n${context}` : ""}
${knowledgeContext ? `Relevant past experience from knowledge base:\n${knowledgeContext}` : ""}

Produce a plan (JSON only).`,
  };

  try {
    const plan = await chatJson([system, user], PlanSchema);

    // Validate plan has at least one task
    if (!plan.tasks || plan.tasks.length === 0) {
      throw new PlanningError(
        "Generated plan has no tasks - LLM returned empty task list"
      );
    }

    // Validate task structure
    for (const task of plan.tasks) {
      if (!task.id || !task.description) {
        throw new PlanningError(
          `Invalid task in plan: missing id or description (task: ${JSON.stringify(task)})`
        );
      }
    }

    return plan;
  } catch (err) {
    // Re-throw if already a PlanningError
    if (err instanceof PlanningError) {
      throw err;
    }

    // Wrap LLM errors
    if (err instanceof LLMError || err instanceof LLMParseError) {
      throw new PlanningError(
        `Failed to generate plan: ${getErrorMessage(err)}`,
        err
      );
    }

    // Wrap unknown errors
    throw new PlanningError(
      `Unexpected error during planning: ${getErrorMessage(err)}`,
      err instanceof Error ? err : undefined
    );
  }
}
