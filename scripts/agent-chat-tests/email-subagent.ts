/**
 * Subagent: tests send_email via agent chat prompts.
 */

import { runOneTurn, loadEnv } from "./chat-runner";
import type { SubagentResult, TestCaseResult } from "./types";

const TEST_RECIPIENT = "test@example.com";

function parseToolResult(resultJson: string): { success?: boolean; error?: string } {
  try {
    const o = JSON.parse(resultJson);
    return { success: o.success, error: o.error };
  } catch {
    return {};
  }
}

export async function runEmailTests(): Promise<SubagentResult> {
  loadEnv();
  const results: TestCaseResult[] = [];

  // 1. Explicit send-email prompt
  const prompt1 = `Send an email to ${TEST_RECIPIENT} with subject "Agent test" and body "This is an automated test from the Master Agent chat."`;
  const run1 = await runOneTurn(prompt1);
  const sendEmailCalls = run1.toolResults?.filter((r) => r.name === "send_email") ?? [];
  const lastEmailResult = sendEmailCalls[sendEmailCalls.length - 1];
  const parsed1 = lastEmailResult ? parseToolResult(lastEmailResult.result) : {};
  const ok1 = run1.error ? false : parsed1.success === true;
  results.push({
    prompt: prompt1,
    ok: ok1,
    detail: run1.error
      ? run1.error
      : lastEmailResult
        ? parsed1.error || (parsed1.success ? "Email sent (or attempted)." : lastEmailResult.result.slice(0, 200))
        : run1.content?.slice(0, 200) || "No send_email tool call.",
    toolCalls: run1.toolResults?.map((r) => r.name),
    rawResult: lastEmailResult?.result?.slice(0, 300),
  });

  return { name: "email (send_email)", results };
}
