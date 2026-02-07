import type OpenAI from "openai";
import { getEnv } from "@/lib/env";
import { ollamaChat, type ChatMessage as OllamaChatMessage } from "./ollama";
import {
  LLMError,
  LLMParseError,
  withRetry,
  withTimeout,
  getErrorMessage,
} from "@/utils/errors";

/** Default timeout for LLM API calls (2 minutes) */
const DEFAULT_TIMEOUT_MS = 120000;

/** Default retry options for transient errors */
const DEFAULT_RETRY_OPTIONS = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  onRetry: (attempt: number, error: Error, delayMs: number) => {
    console.warn(
      `[LLM] Retry attempt ${attempt} after ${delayMs}ms due to: ${error.message}`
    );
  },
};

/** True when a valid OpenAI API key is set; otherwise the agent can use local Ollama. */
export function hasOpenAI(): boolean {
  const apiKey = getEnv("OPENAI_API_KEY");
  return Boolean(apiKey && apiKey !== "sk-placeholder");
}

if (!hasOpenAI()) {
  console.warn(
    "OPENAI_API_KEY not set. Set it in Settings → API keys or in .env. Agent will use local Ollama if OLLAMA_HOST is reachable (e.g. http://localhost:11434)."
  );
}

let _openai: OpenAI | null = null;
let _openaiConfig: { apiKey: string; baseURL?: string } | null = null;

async function getOpenAIClient(): Promise<OpenAI> {
  const apiKey = getEnv("OPENAI_API_KEY") || "sk-placeholder";
  const baseURL = getEnv("OPENAI_BASE_URL") || undefined;
  if (
    _openai &&
    _openaiConfig &&
    _openaiConfig.apiKey === apiKey &&
    _openaiConfig.baseURL === baseURL
  ) {
    return _openai;
  }
  const { default: OpenAIClass } = await import("openai");
  _openaiConfig = { apiKey, baseURL };
  _openai = new OpenAIClass({
    apiKey,
    ...(baseURL && { baseURL }),
  });
  return _openai;
}

/** Vision: user message content can be text or multipart (text + images). */
export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ChatContentPart[];
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Timeout in milliseconds (default: 120000) */
  timeoutMs?: number;
  /** Number of retry attempts for transient errors (default: 3) */
  maxRetries?: number;
}

/** Tool definition for chatWithTools (OpenAI-compatible schema). */
export interface ChatToolDef {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
  execute: (args: Record<string, unknown>) => Promise<string>;
}

/**
 * Send a chat completion request to the LLM.
 * Includes retry logic for transient errors and timeout handling.
 * @throws LLMError on API errors after retries exhausted
 */
export async function chat(
  messages: ChatMessage[],
  options?: ChatOptions
): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options?.maxRetries ?? DEFAULT_RETRY_OPTIONS.maxRetries;

  const makeRequest = async (): Promise<string> => {
    if (hasOpenAI()) {
      const openai = await getOpenAIClient();
      const model = options?.model ?? "gpt-4o-mini";

      try {
        const response = await openai.chat.completions.create({
          model,
          messages: messages.map((m) => ({ role: m.role, content: m.content })) as OpenAI.Chat.ChatCompletionMessageParam[],
          temperature: options?.temperature ?? 0.3,
          max_tokens: options?.maxTokens ?? 4096,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new LLMError("Empty LLM response - no content returned", undefined, true);
        }
        return content;
      } catch (err) {
        // Don't wrap if already an LLMError
        if (err instanceof LLMError) throw err;
        throw LLMError.fromApiError(err);
      }
    }

    // Fallback to Ollama (only supports string content; flatten multipart to text)
    const model = options?.model ?? process.env.OLLAMA_MODEL ?? "llama3.2";
    const ollamaMessages: OllamaChatMessage[] = messages.map((m) => ({
      role: m.role,
      content:
        typeof m.content === "string"
          ? m.content
          : m.content
              .map((p) => (p.type === "text" ? p.text : "[image]"))
              .join(" "),
    }));
    try {
      return await ollamaChat(ollamaMessages, {
        model,
        temperature: options?.temperature ?? 0.3,
      });
    } catch (err) {
      if (err instanceof LLMError) throw err;
      throw LLMError.fromApiError(err);
    }
  };

  // Wrap with timeout and retry
  return withRetry(
    () => withTimeout(makeRequest, timeoutMs, "LLM chat request"),
    {
      ...DEFAULT_RETRY_OPTIONS,
      maxRetries,
      isRetryable: (error) => error instanceof LLMError && error.retryable,
    }
  );
}

const MAX_TOOL_ROUNDS = 5;

const TOOL_CALL_JSON_RE =
  /\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"(?:parameters|arguments)"\s*:\s*(\{[\s\S]*\})\s*\}/;

/**
 * When the model outputs a tool call as text (e.g. "Here's a JSON response: {...}") instead of
 * using native tool_calls, parse and return it so we can still execute the tool.
 */
function parseToolCallFromContent(
  content: string,
  toolNames: string[]
): { name: string; args: Record<string, unknown> } | null {
  if (!content || typeof content !== "string") return null;
  const match = content.match(TOOL_CALL_JSON_RE);
  if (!match) return null;
  const name = match[1].trim();
  if (!toolNames.includes(name)) return null;
  const paramsStr = extractBraceObject(match[2]);
  if (!paramsStr) return null;
  try {
    const args = JSON.parse(paramsStr) as Record<string, unknown>;
    return { name, args };
  } catch {
    return null;
  }
}

/** Extract the outermost { ... } from a string that may have trailing/leading junk. */
function extractBraceObject(s: string): string | null {
  const start = s.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Chat with tool-calling support. When the model requests a tool, we execute it and continue until
 * the model returns a normal message or we hit MAX_TOOL_ROUNDS.
 * If the model outputs a tool call as plain text (e.g. JSON in the message), we parse and execute it as a fallback.
 */
export async function chatWithTools(
  messages: ChatMessage[],
  tools: ChatToolDef[],
  options?: ChatOptions
): Promise<{ content: string; toolResults?: Array<{ name: string; result: string }> }> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const toolResults: Array<{ name: string; result: string }> = [];

  const openAiTools = tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));

  const executeTool = async (name: string, args: Record<string, unknown>): Promise<string> => {
    const def = tools.find((t) => t.name === name);
    if (!def) return JSON.stringify({ error: `Unknown tool: ${name}` });
    try {
      return await def.execute(args);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return JSON.stringify({ error: msg });
    }
  };

  type MessageForRound =
    | { role: "system" | "user" | "assistant"; content: string | ChatContentPart[] }
    | (OpenAI.Chat.ChatCompletionMessageParam & { role: "assistant"; tool_calls?: unknown[] })
    | { role: "tool"; content: string; tool_call_id: string };

  const makeRound = async (
    currentMessages: MessageForRound[]
  ): Promise<{
    content: string;
    toolCalls?: Array<{ id: string; name: string; args: string }>;
    assistantMessage?: OpenAI.Chat.ChatCompletionMessageParam;
  }> => {
    if (hasOpenAI()) {
      const openai = await getOpenAIClient();
      const model = options?.model ?? "gpt-4o-mini";
      const response = await openai.chat.completions.create({
        model,
        messages: currentMessages as OpenAI.Chat.ChatCompletionMessageParam[],
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxTokens ?? 4096,
        tools: openAiTools,
        tool_choice: "auto",
      });
      const msg = response.choices[0]?.message;
      if (!msg) throw new LLMError("Empty LLM response", undefined, true);
      const content = (msg.content as string) ?? "";
      const toolCalls = msg.tool_calls?.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        args: tc.function.arguments,
      }));
      const assistantMessage: OpenAI.Chat.ChatCompletionMessageParam =
        toolCalls && toolCalls.length > 0
          ? {
              role: "assistant",
              content: content || null,
              tool_calls: msg.tool_calls!.map((tc) => ({
                id: tc.id,
                type: "function" as const,
                function: { name: tc.function.name, arguments: tc.function.arguments },
              })),
            }
          : { role: "assistant", content: content || "" };
      return { content, toolCalls, assistantMessage };
    }

    const client = (await import("./ollama")).getOllamaClient();
    const model = options?.model ?? process.env.OLLAMA_MODEL ?? "llama3.2";
    const ollamaTools = tools.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
    const response = await client.chat({
      model,
      messages: currentMessages.map((m) => {
        const c = (m as { content?: unknown }).content;
        return { role: m.role, content: typeof c === "string" ? c : "" };
      }),
      stream: false,
      tools: ollamaTools,
      options: { temperature: options?.temperature ?? 0.3 },
    });
    const msg = response.message;
    const content = msg?.content ?? "";
    const toolCalls = msg?.tool_calls?.map((tc) => ({
      id: `ollama-${tc.function.name}`,
      name: tc.function.name,
      args: typeof tc.function.arguments === "string" ? tc.function.arguments : JSON.stringify(tc.function.arguments ?? {}),
    }));
    return { content, toolCalls };
  };

  let currentMessages: MessageForRound[] = messages.map((m) => ({ role: m.role, content: m.content }));
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const roundResult = await withTimeout(
      () => makeRound(currentMessages),
      timeoutMs,
      "LLM chatWithTools round"
    );
    const { content, toolCalls, assistantMessage } = roundResult;

    if (!toolCalls || toolCalls.length === 0) {
      const toolNames = tools.map((t) => t.name);
      const parsed = parseToolCallFromContent(content ?? "", toolNames);
      if (parsed) {
        const result = await executeTool(parsed.name, parsed.args);
        toolResults.push({ name: parsed.name, result });
      }
      return { content: content || "Done.", toolResults: toolResults.length ? toolResults : undefined };
    }

    const toolResultParts: Array<{ role: "tool"; content: string; tool_call_id: string }> = [];
    for (const tc of toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.args || "{}");
      } catch {
        args = {};
      }
      const result = await executeTool(tc.name, args);
      toolResults.push({ name: tc.name, result });
      toolResultParts.push({ role: "tool", content: result, tool_call_id: tc.id });
    }

    if (hasOpenAI() && assistantMessage && "tool_calls" in assistantMessage) {
      currentMessages = [
        ...currentMessages,
        assistantMessage,
        ...toolResultParts,
      ];
    } else {
      currentMessages = [
        ...currentMessages,
        { role: "assistant", content },
        ...toolResultParts.map((p) => ({
          role: "tool" as const,
          content: p.content,
          tool_call_id: p.tool_call_id,
        })),
      ];
    }
  }

  return {
    content: "Stopped after several tool rounds. You can ask again if something is missing.",
    toolResults: toolResults.length ? toolResults : undefined,
  };
}

/**
 * Attempt to extract valid JSON from a potentially malformed response.
 */
function extractJson(raw: string): string {
  // Remove markdown code fences
  let cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  // Try to find JSON object or array in the response
  const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    cleaned = jsonMatch[1];
  }

  return cleaned;
}

/**
 * Send a chat request and parse the response as JSON with schema validation.
 * Includes retry logic and JSON parsing error recovery.
 * @throws LLMError on API errors
 * @throws LLMParseError on JSON parsing failures
 */
export async function chatJson<T>(
  messages: ChatMessage[],
  schema: { parse: (v: unknown) => T },
  options?: ChatOptions
): Promise<T> {
  const systemSuffix =
    "\nRespond with valid JSON only, no markdown or explanation.";
  const adjusted: ChatMessage[] = messages.map((m, i) =>
    i === 0 && m.role === "system"
      ? { ...m, content: m.content + systemSuffix }
      : m
  );
  if (adjusted[0]?.role !== "system") {
    adjusted.unshift({
      role: "system",
      content: "You are a precise assistant." + systemSuffix,
    });
  }

  const raw = await chat(adjusted, { ...options, temperature: 0.2 });

  // Attempt to parse JSON with recovery
  const cleaned = extractJson(raw);

  try {
    const parsed = JSON.parse(cleaned);
    return schema.parse(parsed);
  } catch (parseErr) {
    // If initial parse fails, try one more time with a recovery prompt
    const errorMessage = getErrorMessage(parseErr);

    // Check if it's a JSON syntax error vs schema validation error
    if (errorMessage.includes("JSON") || errorMessage.includes("Unexpected")) {
      throw new LLMParseError(
        `Failed to parse LLM response as JSON: ${errorMessage}`,
        raw,
        parseErr instanceof Error ? parseErr : undefined
      );
    }

    // Schema validation error - still wrap but indicate what failed
    throw new LLMParseError(
      `LLM response failed schema validation: ${errorMessage}`,
      raw,
      parseErr instanceof Error ? parseErr : undefined
    );
  }
}
