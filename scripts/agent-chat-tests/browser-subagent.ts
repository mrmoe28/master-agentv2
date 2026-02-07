/**
 * Subagent: tests browser_navigate and browser_extract via agent chat prompts.
 */

import { runOneTurn, loadEnv } from "./chat-runner";
import type { SubagentResult, TestCaseResult } from "./types";

const TEST_URL = "https://example.com";

function parseToolResult(resultJson: string): { success?: boolean; error?: string; text?: string } {
  try {
    const o = JSON.parse(resultJson);
    return { success: o.success, error: o.error, text: o.text };
  } catch {
    return {};
  }
}

export async function runBrowserTests(): Promise<SubagentResult> {
  loadEnv();
  const results: TestCaseResult[] = [];

  // 1. Open URL and extract text
  const prompt1 = `Open ${TEST_URL} and extract the main text from the page (use browser_navigate then browser_extract).`;
  const run1 = await runOneTurn(prompt1);
  const navCalls = run1.toolResults?.filter((r) => r.name === "browser_navigate") ?? [];
  const extractCalls = run1.toolResults?.filter((r) => r.name === "browser_extract") ?? [];
  const navOk = navCalls.length > 0 && parseToolResult(navCalls[navCalls.length - 1].result).success === true;
  const lastExtract = extractCalls[extractCalls.length - 1];
  const extractParsed = lastExtract ? parseToolResult(lastExtract.result) : {};
  const extractOk = lastExtract && extractParsed.success === true && (extractParsed.text?.length ?? 0) > 0;
  const ok1 = !run1.error && navOk && extractOk;
  results.push({
    prompt: prompt1,
    ok: ok1,
    detail: run1.error
      ? run1.error
      : !navOk
        ? "browser_navigate failed or not called: " + (navCalls[0]?.result?.slice(0, 150) ?? "none")
        : !extractOk
          ? "browser_extract failed or empty: " + (lastExtract?.result?.slice(0, 150) ?? "none")
          : `Navigated and extracted ${extractParsed.text?.length ?? 0} chars.`,
    toolCalls: run1.toolResults?.map((r) => r.name),
    rawResult: lastExtract?.result?.slice(0, 300),
  });

  return { name: "browser (navigate + extract)", results };
}
