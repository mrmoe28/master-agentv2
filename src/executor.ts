import { chatJson } from "./llm/client";
import type { ChatMessage } from "./llm/client";
import type { Task, TaskResult, ToolCall } from "./agent-types";
import { getTool, tools } from "./tools/registry";
import {
  recordTaskResult,
  addMemoryEntry,
  getRecentContext,
  getTaskResultsSummary,
} from "./memory";
import type { AgentMemory } from "./agent-types";
import { z } from "zod";
import { getErrorMessage } from "@/utils/errors";

const ToolCallSchema = z.object({
  tool: z.string(),
  args: z.record(z.unknown()),
  reasoning: z.string().optional(),
});

const ExecutorResponseSchema = z.object({
  reasoning: z.string().describe("Chain-of-thought reasoning for this task"),
  toolCalls: z.array(ToolCallSchema).describe("Tools to call for this task"),
  summary: z.string().optional().describe("Brief summary of what was done"),
});

export async function executeTask(
  task: Task,
  goalDescription: string,
  memory: AgentMemory
): Promise<TaskResult> {
  const start = Date.now();
  const toolCalls: ToolCall[] = [];
  const context = getRecentContext(memory, 25);
  const resultsSummary = getTaskResultsSummary(memory);
  const toolsList = tools
    .map((t) => `- ${t.name}: ${t.description}`)
    .join("\n");

  const system: ChatMessage = {
    role: "system",
    content: `You are an executor agent. For the given task, use chain-of-thought reasoning and select one or more tools to accomplish it. Output JSON only.

Available tools:
${toolsList}

Output format: { "reasoning": "step-by-step reasoning", "toolCalls": [ { "tool": "tool_name", "args": { ... }, "reasoning": "why" } ], "summary": "optional brief summary" }

For "parse/organize leads": use parse_leads then get_leads_summary.
For "email them": use send_emails or send_email (to, subject, body).
For "schedule followups": use schedule_followups or schedule_meeting (summary, start, end, attendees).
For "SMS": use send_sms (to, body). For "call": use call_customer (to, twimlUrl).
For "upload file": use upload_file (name, mimeType, content).
For "update CRM": use update_crm with leadIds and updates like { "status": "contacted" }.
For "report results": use report_results.`,
  };

  const user: ChatMessage = {
    role: "user",
    content: `Goal: ${goalDescription}

Task: ${task.description}
${task.toolHint ? `Suggested tool: ${task.toolHint}` : ""}
${task.reasoning ? `Planner reasoning: ${task.reasoning}` : ""}

${context ? `Recent context:\n${context}` : ""}
${resultsSummary ? `Completed tasks:\n${resultsSummary}` : ""}

Output JSON with reasoning and toolCalls.`,
  };

  let output = "";
  let success = true;
  let lastError: string | undefined;

  try {
    const parsed = await chatJson([system, user], ExecutorResponseSchema);
    addMemoryEntry(memory, {
      type: "observation",
      taskId: task.id,
      content: `Executor reasoning: ${parsed.reasoning}`,
    });

    for (const tc of parsed.toolCalls ?? []) {
      const def = getTool(tc.tool);

      // Track the tool call regardless of outcome
      const toolCall: ToolCall = {
        tool: tc.tool,
        args: tc.args,
        reasoning: tc.reasoning,
      };
      toolCalls.push(toolCall);

      if (!def) {
        lastError = `Unknown tool: ${tc.tool}`;
        success = false;
        output += `[${tc.tool} ERROR]: Unknown tool\n`;
        addMemoryEntry(memory, {
          type: "observation",
          taskId: task.id,
          content: `Unknown tool called: ${tc.tool}`,
        });
        continue;
      }

      try {
        const safeArgs = def.parameters.safeParse(tc.args);
        if (!safeArgs.success) {
          // Log validation warning but continue with raw args
          console.warn(
            `[Executor] Schema validation failed for ${tc.tool}: ${safeArgs.error.message}. Using raw args.`
          );
          addMemoryEntry(memory, {
            type: "observation",
            taskId: task.id,
            content: `Tool ${tc.tool} args validation warning: ${safeArgs.error.message}`,
          });
        }
        const args = safeArgs.success ? safeArgs.data : (tc.args as Record<string, unknown>);

        const result = await def.execute(args);
        output += `[${tc.tool}]: ${result}\n`;
        addMemoryEntry(memory, {
          type: "observation",
          taskId: task.id,
          content: `Tool ${tc.tool} => ${result.slice(0, 200)}`,
        });
      } catch (e) {
        const errMsg = getErrorMessage(e);
        lastError = errMsg;
        success = false;
        output += `[${tc.tool} ERROR]: ${errMsg}\n`;
        addMemoryEntry(memory, {
          type: "observation",
          taskId: task.id,
          content: `Tool ${tc.tool} failed: ${errMsg}`,
        });
      }
    }

    if (parsed.summary) output = parsed.summary + "\n" + output;
  } catch (e) {
    const errMsg = getErrorMessage(e);
    lastError = errMsg;
    success = false;
    output = errMsg;

    addMemoryEntry(memory, {
      type: "observation",
      taskId: task.id,
      content: `Executor failed to parse LLM response: ${errMsg}`,
    });
  }

  const result: TaskResult = {
    taskId: task.id,
    success,
    output: output.trim() || (lastError ?? "No output"),
    toolCalls,
    error: lastError,
    durationMs: Date.now() - start,
  };

  recordTaskResult(memory, result);
  return result;
}
