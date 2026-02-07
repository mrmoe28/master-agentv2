import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { listOllamaModels } from "@/llm/ollama";

/**
 * Returns current LLM config (no secrets): Ollama host, connection status, and detected models.
 * Used by the model config dialog for auto model detection.
 */
export async function GET() {
  const ollamaHost =
    getEnv("OLLAMA_HOST").trim() || "http://localhost:11434";
  const openaiConfigured = Boolean(
    getEnv("OPENAI_API_KEY") &&
      getEnv("OPENAI_API_KEY") !== "sk-placeholder"
  );

  const ollama = await listOllamaModels(ollamaHost);

  return NextResponse.json({
    ollamaHost: ollama.host,
    ollamaOk: ollama.ok,
    ollamaModels: ollama.models ?? [],
    ollamaError: ollama.error ?? null,
    openaiConfigured,
    defaultOllamaModel: process.env.OLLAMA_MODEL || null,
  });
}
