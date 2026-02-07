/**
 * Subagent: tests open_url and create_file via agent chat prompts.
 */

import { runOneTurn, loadEnv } from "./chat-runner";
import type { SubagentResult, TestCaseResult } from "./types";

function parseToolResult(resultJson: string): { success?: boolean; error?: string } {
  try {
    const o = JSON.parse(resultJson);
    return { success: o.success, error: o.error };
  } catch {
    return {};
  }
}

export async function runDesktopTests(): Promise<SubagentResult> {
  loadEnv();
  const results: TestCaseResult[] = [];

  // 1. open_url
  const prompt1 = `Open https://example.com in my default browser (use the open_url tool).`;
  const run1 = await runOneTurn(prompt1);
  const openUrlCalls = run1.toolResults?.filter((r) => r.name === "open_url") ?? [];
  const lastOpen = openUrlCalls[openUrlCalls.length - 1];
  const parsed1 = lastOpen ? parseToolResult(lastOpen.result) : {};
  const ok1 = !run1.error && openUrlCalls.length > 0 && parsed1.success !== false;
  results.push({
    prompt: prompt1,
    ok: ok1,
    detail: run1.error
      ? run1.error
      : openUrlCalls.length === 0
        ? "open_url not called: " + (run1.content?.slice(0, 150) ?? "no content")
        : parsed1.error || "open_url called.",
    toolCalls: run1.toolResults?.map((r) => r.name),
  });

  // 2. create_file (on desktop to avoid polluting repo)
  const prompt2 = `Create a file on my Desktop named agent-test-file.txt with content "Created by agent chat test." Use create_file with on_desktop: true.`;
  const run2 = await runOneTurn(prompt2);
  const createCalls = run2.toolResults?.filter((r) => r.name === "create_file") ?? [];
  const lastCreate = createCalls[createCalls.length - 1];
  const parsed2 = lastCreate ? parseToolResult(lastCreate.result) : {};
  const ok2 = !run2.error && createCalls.length > 0 && parsed2.success !== false;
  results.push({
    prompt: prompt2,
    ok: ok2,
    detail: run2.error
      ? run2.error
      : createCalls.length === 0
        ? "create_file not called."
        : parsed2.error || "create_file called.",
    toolCalls: run2.toolResults?.map((r) => r.name),
  });

  return { name: "desktop (open_url, create_file)", results };
}
