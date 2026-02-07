"use client";

import {
  Mail,
  MessageSquare,
  Calendar,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Status = {
  google: boolean;
  googleConfigMissing?: boolean;
  twilio: boolean;
  sendgrid: boolean;
};

type IntegrationId = "google" | "twilio" | "sendgrid";

const integrations: {
  id: IntegrationId;
  name: string;
  description: string;
  icon: typeof Mail;
  envHint?: string;
}[] = [
  {
    id: "google",
    name: "Google",
    description: "Gmail, Calendar, and Drive — connect one account for all.",
    icon: Calendar,
    envHint: "GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI",
  },
  {
    id: "twilio",
    name: "Twilio",
    description: "SMS and voice messaging.",
    icon: MessageSquare,
    envHint: "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER",
  },
  {
    id: "sendgrid",
    name: "SendGrid",
    description: "Email delivery and templates.",
    icon: Mail,
    envHint: "SENDGRID_API_KEY",
  },
];

function IntegrationsContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [testEmailTo, setTestEmailTo] = useState("");
  const [testEmailResult, setTestEmailResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [googleTestEmailTo, setGoogleTestEmailTo] = useState("");
  const [googleTestEmailResult, setGoogleTestEmailResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [sendingGoogleTestEmail, setSendingGoogleTestEmail] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/integrations/status");
      const data = await res.json();
      setStatus(data);
      setError(null);
    } catch {
      setStatus({
        google: false,
        googleConfigMissing: true,
        twilio: false,
        sendgrid: false,
      });
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const err = searchParams.get("error");
    if (connected) fetchStatus();
    if (err === "google_denied") setError("Google sign-in was cancelled.");
    if (err === "no_code" || err === "exchange_failed")
      setError("Google connection failed. Please try again.");
  }, [searchParams]);

  const handleConnectGoogle = async () => {
    setLoading((p) => ({ ...p, google: true }));
    try {
      const res = await fetch("/api/integrations/google/auth-url");
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setError(data.error ?? "Could not get Google sign-in URL.");
    } catch {
      setError("Could not start Google sign-in.");
    } finally {
      setLoading((p) => ({ ...p, google: false }));
    }
  };

  const handleTest = async (id: "twilio" | "sendgrid") => {
    setLoading((p) => ({ ...p, [id]: true }));
    setError(null);
    setTestEmailResult(null);
    try {
      const res = await fetch(`/api/integrations/${id}/test`);
      const data = await res.json();
      if (data.connected) await fetchStatus();
      else setError(data.error ?? `Could not connect to ${id}.`);
    } catch {
      setError(`Could not test ${id} connection.`);
    } finally {
      setLoading((p) => ({ ...p, [id]: false }));
    }
  };

  const handleSendTestEmail = async () => {
    const to = testEmailTo.trim();
    if (!to) {
      setTestEmailResult({ ok: false, message: "Enter an email address." });
      return;
    }
    setSendingTestEmail(true);
    setError(null);
    setTestEmailResult(null);
    try {
      const res = await fetch("/api/integrations/sendgrid/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const data = await res.json();
      if (data.success) {
        setTestEmailResult({ ok: true, message: "Test email sent. Check the inbox (and spam)." });
      } else {
        setTestEmailResult({ ok: false, message: data.error ?? "Send failed." });
      }
    } catch {
      setTestEmailResult({ ok: false, message: "Request failed." });
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleSendGoogleTestEmail = async () => {
    const to = googleTestEmailTo.trim();
    if (!to) {
      setGoogleTestEmailResult({ ok: false, message: "Enter an email address." });
      return;
    }
    setSendingGoogleTestEmail(true);
    setError(null);
    setGoogleTestEmailResult(null);
    try {
      const res = await fetch("/api/integrations/google/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const data = await res.json();
      if (data.success) {
        setGoogleTestEmailResult({ ok: true, message: "Test email sent via Gmail. Check the inbox (and spam)." });
      } else {
        setGoogleTestEmailResult({ ok: false, message: data.error ?? "Send failed." });
      }
    } catch {
      setGoogleTestEmailResult({ ok: false, message: "Request failed." });
    } finally {
      setSendingGoogleTestEmail(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center border-b border-border px-4">
        <h1 className="font-semibold text-foreground">Integrations</h1>
      </header>
      <div className="flex-1 overflow-auto p-4">
        <p className="mb-6 text-sm text-muted-foreground">
          Connect APIs, tools, and data sources for the master agent.
        </p>
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            <XCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {searchParams.get("connected") === "google" && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-primary/50 bg-primary/10 px-4 py-2 text-sm text-foreground">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
            Google connected successfully.
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.map(({ id, name, description, icon: Icon, envHint }) => {
            const connected = status?.[id] ?? false;
            const isLoading = loading[id] ?? false;
            return (
              <Card key={id} className="flex flex-col p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{name}</h3>
                      {connected ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <XCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {description}
                    </p>
                    {id === "google" && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        You sign in with your Google account (email and password
                        on Google&apos;s secure page). This app never sees or
                        stores your password.
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  {id === "google" ? (
                    <>
                      {status?.googleConfigMissing && (
                        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-xs text-foreground">
                          <p className="font-medium text-amber-700 dark:text-amber-400">
                            One-time setup required
                          </p>
                          <ol className="mt-2 list-inside list-decimal space-y-1 text-muted-foreground">
                            <li>
                              Go to{" "}
                              <a
                                href="https://console.cloud.google.com/apis/credentials"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline"
                              >
                                Google Cloud Console → APIs &amp; Credentials
                              </a>
                            </li>
                            <li>
                              Create or select a project. In &quot;APIs &amp;
                              Services&quot; → &quot;Library&quot;, enable Gmail
                              API, Google Calendar API, and Google Drive API.
                            </li>
                            <li>
                              &quot;Create Credentials&quot; → &quot;OAuth client
                              ID&quot;. Application type: &quot;Web
                              application&quot;.
                            </li>
                            <li>
                              Add redirect URI:{" "}
                              <code className="rounded bg-muted px-1">
                                {typeof window !== "undefined"
                                  ? `${window.location.origin}/api/integrations/google/callback`
                                  : "http://localhost:6001/api/integrations/google/callback"}
                              </code>
                            </li>
                            <li>
                              Copy Client ID and Client secret into your{" "}
                              <code className="rounded bg-muted px-1">.env</code>{" "}
                              (see below). Restart the app, then click
                              &quot;Connect with Google&quot;.
                            </li>
                          </ol>
                          <p className="mt-2 text-muted-foreground">
                            In <code className="rounded bg-muted px-1">.env</code>
                            :
                          </p>
                          <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 text-[11px]">
                            {`GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=${typeof window !== "undefined" ? window.location.origin : "http://localhost:6001"}/api/integrations/google/callback`}
                          </pre>
                        </div>
                      )}
                    <Button
                      size="sm"
                      variant={connected ? "secondary" : "default"}
                      onClick={handleConnectGoogle}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : connected ? (
                        "Reconnect with Google"
                      ) : (
                        <>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Connect with Google
                        </>
                      )}
                    </Button>
                    {connected && (
                      <div className="mt-3 space-y-2 border-t border-border pt-3">
                        <p className="text-xs font-medium text-muted-foreground">
                          Send test email (via Gmail)
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="email"
                            placeholder="To address"
                            value={googleTestEmailTo}
                            onChange={(e) => setGoogleTestEmailTo(e.target.value)}
                            className="h-8 flex-1 min-w-[160px] rounded-md border border-input bg-background px-2 text-sm"
                          />
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={handleSendGoogleTestEmail}
                            disabled={sendingGoogleTestEmail}
                          >
                            {sendingGoogleTestEmail ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Send"
                            )}
                          </Button>
                        </div>
                        {googleTestEmailResult && (
                          <p
                            className={
                              googleTestEmailResult.ok
                                ? "text-xs text-emerald-600 dark:text-emerald-400"
                                : "text-xs text-destructive"
                            }
                          >
                            {googleTestEmailResult.message}
                          </p>
                        )}
                      </div>
                    )}
                    </>
                  ) : (
                    <>
                      {envHint && (
                        <p className="text-xs text-muted-foreground">
                          Set in .env: {envHint}
                          {id === "sendgrid" &&
                            ". Set MAIL_FROM_EMAIL to your verified sender (e.g. in Settings → API keys)."}
                        </p>
                      )}
                      <Button
                        size="sm"
                        variant={connected ? "secondary" : "outline"}
                        onClick={() => handleTest(id as "twilio" | "sendgrid")}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : connected ? (
                          "Test again"
                        ) : (
                          "Test connection"
                        )}
                      </Button>
                      {id === "sendgrid" && (
                        <div className="mt-3 space-y-2 border-t border-border pt-3">
                          <p className="text-xs font-medium text-muted-foreground">
                            Send test email
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="email"
                              placeholder="To address"
                              value={testEmailTo}
                              onChange={(e) => setTestEmailTo(e.target.value)}
                              className="h-8 flex-1 min-w-[160px] rounded-md border border-input bg-background px-2 text-sm"
                              suppressHydrationWarning
                            />
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={handleSendTestEmail}
                              disabled={sendingTestEmail}
                            >
                              {sendingTestEmail ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Send"
                              )}
                            </Button>
                          </div>
                          {testEmailResult && (
                            <p
                              className={
                                testEmailResult.ok
                                  ? "text-xs text-emerald-600 dark:text-emerald-400"
                                  : "text-xs text-destructive"
                              }
                            >
                              {testEmailResult.message}
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
        {status && !status.googleConfigMissing && (
          <p className="mt-6 text-xs text-muted-foreground">
            Google redirect URI must match your app origin +{" "}
            <code className="rounded bg-muted px-1">/api/integrations/google/callback</code>.
          </p>
        )}
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full flex-col">
        <header className="flex h-12 shrink-0 items-center border-b border-border px-4">
          <h1 className="font-semibold text-foreground">Integrations</h1>
        </header>
        <div className="flex flex-1 items-center justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    }>
      <IntegrationsContent />
    </Suspense>
  );
}
