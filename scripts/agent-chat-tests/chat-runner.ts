/**
 * Shared chat runner for agent-chat tests. Runs one user turn with the same
 * tools and system prompt as the app chat API (no HTTP, no RAG/learnings).
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { chatWithTools } from "@/llm/client";
import type { ChatMessage } from "@/llm/client";
import { desktopToolDefs } from "@/llm/desktop-tools";
import { chatIntegrationToolDefs } from "@/llm/chat-integration-tools";
import { browserToolDefs } from "@/llm/browser-tools";
import { runWithBrowserSession } from "@/browser-session";
import { setIntegrationContext } from "@/integration-context";
import { IntegrationService } from "@/services/integration-service";
import { defaultTokenStore } from "@/integrations/token-store";

const SYSTEM_PROMPT = `You are the Master Agent. The user asks in plain language; you have tools and you call them yourself. Never ask the user to provide function names or parameters.

When the user asks to send an email: use send_email with to, subject, and body (body must contain the full message).
When the user asks to open a URL or extract from a page: use browser_navigate first, then browser_snapshot or browser_extract as needed.
When the user asks to open a link in their browser: use open_url.
Use one tool per step. Be concise.`;

const DEFAULT_USER_ID = "default";

export function loadEnv(): void {
  const path = resolve(process.cwd(), ".env");
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = value;
  }
}

const allTools = [
  ...desktopToolDefs,
  ...chatIntegrationToolDefs,
  ...browserToolDefs,
];

export interface RunOneTurnResult {
  content: string;
  toolResults?: Array<{ name: string; result: string }>;
  error?: string;
}

/**
 * Run one chat turn: system + user message, with tools, inside a browser session.
 * Call loadEnv() and setIntegrationContext() before first use.
 */
export async function runOneTurn(userMessage: string): Promise<RunOneTurnResult> {
  setIntegrationContext({
    integrationService: new IntegrationService({ tokenStore: defaultTokenStore }),
    userId: DEFAULT_USER_ID,
  });

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];

  try {
    const result = await runWithBrowserSession(() =>
      chatWithTools(messages, allTools, {
        temperature: 0.3,
        maxTokens: 4096,
      })
    );
    return {
      content: result.content,
      toolResults: result.toolResults,
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return { content: "", error };
  }
}
