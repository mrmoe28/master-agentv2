"use client";

import { useCallback, useEffect, useState } from "react";
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

interface ApiKeysDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const API_KEYS_CONFIG = [
  { name: "OPENAI_API_KEY", description: "Required for the autonomous agent LLM.", secret: true },
  { name: "OPENAI_BASE_URL", description: "Optional; custom API base URL.", secret: false },
  { name: "OLLAMA_HOST", description: "Optional; Ollama host (default http://localhost:11434).", secret: false },
  { name: "SENDGRID_API_KEY", description: "Optional; for SendGrid email integration.", secret: true },
  { name: "MAIL_FROM_EMAIL", description: "Optional; from address for sent emails (e.g. noreply@mastersagent.com).", secret: false },
  { name: "MAIL_FROM_NAME", description: "Optional; from name for sent emails.", secret: false },
  { name: "TWILIO_ACCOUNT_SID", description: "Optional; for Twilio SMS integration.", secret: true },
  { name: "TWILIO_AUTH_TOKEN", description: "Optional; for Twilio SMS integration.", secret: true },
  { name: "TWILIO_PHONE_NUMBER", description: "Optional; Twilio sending number.", secret: false },
  { name: "GOOGLE_API_KEY", description: "Optional; for web_search (Google Custom Search). Same Cloud project; enable Custom Search API.", secret: true },
  { name: "GOOGLE_CUSTOM_SEARCH_ENGINE_ID", description: "Optional; Programmable Search Engine ID (cx) from programmablesearchengine.google.com.", secret: false },
  { name: "SERPER_API_KEY", description: "Optional; for web_search if not using Google (get key at serper.dev).", secret: true },
] as const;

type KeyName = (typeof API_KEYS_CONFIG)[number]["name"];

export function ApiKeysDialog({ open, onOpenChange }: ApiKeysDialogProps) {
  const [status, setStatus] = useState<Record<string, boolean>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/api-keys");
      const data = await res.json();
      if (res.ok && data.keys) setStatus(data.keys);
      else setStatus({});
    } catch {
      setStatus({});
    }
  }, []);

  useEffect(() => {
    if (open) {
      setError(null);
      fetchStatus();
      setValues({});
    }
  }, [open, fetchStatus]);

  const handleChange = (name: KeyName, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, string> = {};
      for (const { name } of API_KEYS_CONFIG) {
        const v = values[name];
        if (v !== undefined) body[name] = v;
      }
      const res = await fetch("/api/settings/api-keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save");
        return;
      }
      if (data.keys) setStatus(data.keys);
      setValues({});
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>API keys</DialogTitle>
          <DialogDescription>
            Enter keys below. They are stored securely on the server (and optionally encrypted if{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">TOKEN_ENCRYPTION_KEY</code> is set).
            Values in <code className="rounded bg-muted px-1 py-0.5 text-xs">.env</code> take precedence.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {API_KEYS_CONFIG.map(({ name, description, secret }) => (
            <div key={name} className="space-y-1.5">
              <label
                htmlFor={name}
                className="text-sm font-medium leading-none font-mono text-muted-foreground"
              >
                {name}
                {status[name] && (
                  <span className="ml-2 text-green-600 dark:text-green-400">(set)</span>
                )}
              </label>
              <Input
                id={name}
                type={secret ? "password" : "text"}
                autoComplete="off"
                placeholder={status[name] ? "Leave blank to keep current" : undefined}
                value={values[name] ?? ""}
                onChange={(e) => handleChange(name, e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
