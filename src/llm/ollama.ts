/**
 * Ollama LLM client and connection verification.
 * Uses OLLAMA_HOST (default: http://localhost:11434).
 */

import { Ollama } from "ollama";
import { getEnv } from "@/lib/env";

const defaultHost = "http://localhost:11434";
const host = getEnv("OLLAMA_HOST") || defaultHost;

let _client: Ollama | null = null;

export function getOllamaClient(): Ollama {
  if (!_client) {
    _client = new Ollama({ host });
  }
  return _client;
}

export interface OllamaConnectionResult {
  ok: boolean;
  host: string;
  models?: { name: string; size: number }[];
  error?: string;
}

/**
 * Verifies connection to the Ollama server by listing available models.
 * Use this to confirm Ollama is running and reachable.
 */
export async function verifyOllamaConnection(): Promise<OllamaConnectionResult> {
  return listOllamaModels(host);
}

/**
 * List models at an arbitrary Ollama host (for UI "detect" without changing env).
 */
export async function listOllamaModels(
  targetHost?: string
): Promise<OllamaConnectionResult> {
  const base = targetHost ?? host;
  const normalized =
    base.startsWith("http://") || base.startsWith("https://")
      ? base
      : `http://${base}`;
  const client = new Ollama({ host: normalized });
  try {
    const list = await client.list();
    return {
      ok: true,
      host: normalized,
      models: (list.models ?? []).map((m) => ({
        name: m.name,
        size: m.size ?? 0,
      })),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      host: normalized,
      error: message,
    };
  }
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Send a chat request to Ollama. Compatible with the existing ChatMessage type.
 */
export async function ollamaChat(
  messages: ChatMessage[],
  options?: { model?: string; temperature?: number }
): Promise<string> {
  const client = getOllamaClient();
  const model = options?.model ?? "llama3.2";
  const response = await client.chat({
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    stream: false,
    ...(options?.temperature != null && {
      options: { temperature: options.temperature },
    }),
  });
  const content = response.message?.content;
  if (content == null) throw new Error("Empty Ollama response");
  return content;
}
