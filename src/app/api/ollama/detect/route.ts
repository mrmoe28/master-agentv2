import { NextResponse } from "next/server";
import { listOllamaModels } from "@/llm/ollama";

/**
 * Test an Ollama host and return list of available models (for "Detect models" in UI).
 * Body: { host: string } (e.g. "http://localhost:11434" or "localhost:11434")
 */
export async function POST(request: Request) {
  let body: { host?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const host = typeof body.host === "string" ? body.host.trim() : "";
  if (!host) {
    return NextResponse.json(
      { ok: false, error: "Missing host in body" },
      { status: 400 }
    );
  }

  const result = await listOllamaModels(host);

  return NextResponse.json({
    ok: result.ok,
    host: result.host,
    models: result.models ?? [],
    error: result.error ?? null,
  });
}
