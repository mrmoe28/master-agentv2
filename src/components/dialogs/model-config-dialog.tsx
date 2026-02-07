"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, XCircle, Server } from "lucide-react";

interface ModelConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LlmConfig {
  ollamaHost: string;
  ollamaOk: boolean;
  ollamaModels: { name: string; size: number }[];
  ollamaError: string | null;
  openaiConfigured: boolean;
  defaultOllamaModel: string | null;
}

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function ModelConfigDialog({ open, onOpenChange }: ModelConfigDialogProps) {
  const [config, setConfig] = useState<LlmConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [detectHost, setDetectHost] = useState("");
  const [detectLoading, setDetectLoading] = useState(false);
  const [detectResult, setDetectResult] = useState<{
    ok: boolean;
    host: string;
    models: { name: string; size: number }[];
    error: string | null;
  } | null>(null);

  const fetchConfig = async () => {
    setConfigLoading(true);
    setDetectResult(null);
    try {
      const res = await fetch("/api/llm/config");
      if (!res.ok) throw new Error("Failed to load config");
      const data = await res.json();
      setConfig(data);
      if (!detectHost && data.ollamaHost) setDetectHost(data.ollamaHost);
    } catch (e) {
      setConfig(null);
    } finally {
      setConfigLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchConfig();
  }, [open]);

  const runDetect = async () => {
    const host = detectHost.trim() || "http://localhost:11434";
    setDetectLoading(true);
    setDetectResult(null);
    try {
      const res = await fetch("/api/ollama/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host }),
      });
      const data = await res.json();
      setDetectResult({
        ok: data.ok,
        host: data.host ?? host,
        models: data.models ?? [],
        error: data.error ?? null,
      });
    } catch (e) {
      setDetectResult({
        ok: false,
        host,
        models: [],
        error: e instanceof Error ? e.message : "Request failed",
      });
    } finally {
      setDetectLoading(false);
    }
  };

  const models = detectResult?.models ?? config?.ollamaModels ?? [];
  const showDetect = detectResult !== null;
  const connected = config?.ollamaOk ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Model configuration</DialogTitle>
          <DialogDescription>
            Connect to a local Ollama instance for zero-config local LLMs. Settings are read from the backend (env).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          {/* Local LLM (Ollama) */}
          <div className="rounded-md border border-border bg-muted/30 px-3 py-3">
            <p className="font-medium flex items-center gap-2">
              <Server className="h-4 w-4" />
              Local LLM (Ollama)
            </p>
            <p className="mt-1 text-muted-foreground">
              Auto-detect models from your Ollama server. Set <code className="rounded bg-muted px-1 py-0.5 text-xs">OLLAMA_HOST</code> and optionally <code className="rounded bg-muted px-1 py-0.5 text-xs">OLLAMA_MODEL</code> in <code className="rounded bg-muted px-1 py-0.5 text-xs">.env</code> to use local models when no OpenAI key is set.
            </p>
            {configLoading ? (
              <div className="mt-3 flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking connection…
              </div>
            ) : config ? (
              <div className="mt-3 flex items-center gap-2">
                {connected ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                <span className={connected ? "text-green-700 dark:text-green-400" : "text-destructive"}>
                  {connected
                    ? `Connected to ${config.ollamaHost}`
                    : config.ollamaError
                      ? `Not connected: ${config.ollamaError}`
                      : "Ollama not reachable"}
                </span>
              </div>
            ) : null}
            <div className="mt-3 flex gap-2">
              <Input
                placeholder="http://localhost:11434"
                value={detectHost}
                onChange={(e) => setDetectHost(e.target.value)}
                className="font-mono text-xs"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={runDetect}
                disabled={detectLoading}
              >
                {detectLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Detect models"
                )}
              </Button>
            </div>
            {showDetect && detectResult && (
              <div className="mt-3">
                {detectResult.ok ? (
                  <>
                    <p className="text-muted-foreground mb-1">
                      {detectResult.models.length} model{detectResult.models.length !== 1 ? "s" : ""} at {detectResult.host}:
                    </p>
                    <ul className="max-h-32 overflow-y-auto rounded border border-border bg-background px-2 py-1 font-mono text-xs">
                      {detectResult.models.length === 0 ? (
                        <li className="text-muted-foreground">No models found. Pull a model in Ollama (e.g. ollama pull llama3.2)</li>
                      ) : (
                        detectResult.models.map((m) => (
                          <li key={m.name}>
                            {m.name}
                            {m.size > 0 && (
                              <span className="ml-2 text-muted-foreground">
                                {formatSize(m.size)}
                              </span>
                            )}
                          </li>
                        ))
                      )}
                    </ul>
                  </>
                ) : (
                  <p className="text-destructive text-xs mt-1">
                    {detectResult.error}
                  </p>
                )}
              </div>
            )}
            {!showDetect && connected && models.length > 0 && (
              <div className="mt-3">
                <p className="text-muted-foreground mb-1">Detected models:</p>
                <ul className="max-h-24 overflow-y-auto rounded border border-border bg-background px-2 py-1 font-mono text-xs">
                  {models.map((m) => (
                    <li key={m.name}>
                      {m.name}
                      {m.size > 0 && (
                        <span className="ml-2 text-muted-foreground">
                          {formatSize(m.size)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* LLM (OpenAI) */}
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
            <p className="font-medium">Cloud LLM</p>
            <p className="mt-0.5 text-muted-foreground">
              OpenAI-compatible API via <code className="rounded bg-muted px-1 py-0.5 text-xs">OPENAI_API_KEY</code> and optional <code className="rounded bg-muted px-1 py-0.5 text-xs">OPENAI_BASE_URL</code>. When set, the agent uses this instead of Ollama.
            </p>
            {config && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {config.openaiConfigured ? "OpenAI key is set (agent will use it)." : "No API key set (agent will use Ollama if available)."}
              </p>
            )}
          </div>

          {/* Embeddings */}
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
            <p className="font-medium">Embeddings</p>
            <p className="mt-0.5 text-muted-foreground">
              Local embeddings via Transformers.js (all-MiniLM-L6-v2). No API key required. Configured in the backend memory layer.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
