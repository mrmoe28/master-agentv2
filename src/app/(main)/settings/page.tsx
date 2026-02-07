"use client";

import { useState } from "react";
import { Key, Cpu, Palette } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/use-ui-store";
import { PageHeader } from "@/components/layout/page-header";
import { ApiKeysDialog } from "@/components/dialogs/api-keys-dialog";
import { ModelConfigDialog } from "@/components/dialogs/model-config-dialog";

export default function SettingsPage() {
  const { darkMode, setDarkMode } = useUIStore();
  const [apiKeysOpen, setApiKeysOpen] = useState(false);
  const [modelConfigOpen, setModelConfigOpen] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Settings" />
      <div className="flex-1 overflow-auto p-4">
        <p className="mb-6 text-sm text-muted-foreground">
          Model, API keys, and preferences.
        </p>
        <div className="max-w-xl space-y-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Palette className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Appearance</h3>
                <p className="text-sm text-muted-foreground">Dark mode</p>
              </div>
              <Switch
                checked={darkMode}
                onCheckedChange={setDarkMode}
              />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Key className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium">API keys</h3>
                <p className="text-sm text-muted-foreground">
                  Enter and manage API keys for OpenAI, SendGrid, Twilio, and Ollama. Values in .env take precedence.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => setApiKeysOpen(true)}
                >
                  Manage API keys
                </Button>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Cpu className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium">Model</h3>
                <p className="text-sm text-muted-foreground">
                  LLM and embedding model settings are read from the backend config.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => setModelConfigOpen(true)}
                >
                  View config
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
      <ApiKeysDialog open={apiKeysOpen} onOpenChange={setApiKeysOpen} />
      <ModelConfigDialog open={modelConfigOpen} onOpenChange={setModelConfigOpen} />
    </div>
  );
}
