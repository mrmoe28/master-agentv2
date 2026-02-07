/**
 * Run all agent-chat subagent tests and print a summary.
 * Usage: npx tsx scripts/agent-chat-tests/run-all.ts
 *
 * Prerequisites:
 * - OPENAI_API_KEY (or OLLAMA) for the LLM
 * - For email: Gmail connected or SENDGRID_API_KEY
 * - For browser: Chrome/Playwright (or CHROME_CDP_URL)
 */

import { runEmailTests } from "./email-subagent";
import { runBrowserTests } from "./browser-subagent";
import { runDesktopTests } from "./desktop-subagent";
import type { SubagentResult, TestCaseResult } from "./types";

function formatResult(r: TestCaseResult): string {
  const status = r.ok ? "OK" : "FAIL";
  const lines = [
    `  [${status}] ${r.prompt.slice(0, 60)}${r.prompt.length > 60 ? "..." : ""}`,
    `      ${r.detail}`,
  ];
  if (r.toolCalls?.length) {
    lines.push(`      tools: ${r.toolCalls.join(", ")}`);
  }
  if (r.rawResult && !r.ok) {
    lines.push(`      raw: ${r.rawResult.slice(0, 120)}...`);
  }
  return lines.join("\n");
}

async function main(): Promise<void> {
  console.log("Agent chat tests — running subagents (email, browser, desktop)\n");

  const agents: Array<{ name: string; run: () => Promise<SubagentResult> }> = [
    { name: "email (send_email)", run: runEmailTests },
    { name: "browser (navigate + extract)", run: runBrowserTests },
    { name: "desktop (open_url, create_file)", run: runDesktopTests },
  ];

  const allResults: SubagentResult[] = [];
  for (const { name, run } of agents) {
    console.log(`--- ${name} ---`);
    try {
      const result = await run();
      allResults.push(result);
      for (const r of result.results) {
        console.log(formatResult(r));
      }
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      console.log(`  [FAIL] ${err}`);
      allResults.push({
        name: name,
        results: [{ prompt: "(subagent threw)", ok: false, detail: err }],
      });
    }
    console.log("");
  }

  // Summary
  const total = allResults.reduce((acc, s) => acc + s.results.length, 0);
  const passed = allResults.reduce(
    (acc, s) => acc + s.results.filter((r) => r.ok).length,
    0
  );
  const failed = total - passed;

  console.log("========== SUMMARY ==========");
  console.log(`Total: ${passed} passed, ${failed} failed (${total} tests)`);
  console.log("");

  const works: string[] = [];
  const broken: string[] = [];
  for (const sub of allResults) {
    const okCount = sub.results.filter((r) => r.ok).length;
    const totalSub = sub.results.length;
    const label = `${sub.name}: ${okCount}/${totalSub}`;
    if (okCount === totalSub) works.push(label);
    else broken.push(label);
  }
  if (works.length) {
    console.log("Works:");
    works.forEach((w) => console.log("  - " + w));
  }
  if (broken.length) {
    console.log("Does not work (or partial):");
    broken.forEach((b) => console.log("  - " + b));
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
