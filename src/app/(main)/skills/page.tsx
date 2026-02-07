"use client";

import { BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StoredSkill {
  id: string;
  name: string;
  description: string;
  steps: string;
  createdAt: string;
}

function formatLearnedAt(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<StoredSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/skills")
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText || "Failed to load skills");
        return res.json();
      })
      .then((data: { skills?: StoredSkill[] }) => {
        if (!cancelled && Array.isArray(data.skills)) {
          setSkills(data.skills);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-border px-4">
        <h1 className="font-semibold text-foreground">Skills</h1>
      </header>
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            Loading skills…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-muted-foreground">
            <p className="font-medium">Could not load skills</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        ) : skills.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-muted-foreground">
            <BookOpen className="mx-auto h-12 w-12 opacity-50" />
            <p className="mt-2 font-medium">No skills yet</p>
            <p className="mt-1 text-sm">
              Teach the agent a procedure in chat (e.g. &quot;when I say onboarding, do X then Y&quot;) and it will save it here.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {skills.map((s) => (
              <li key={s.id}>
                <Card className="p-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">{s.name}</span>
                      <Badge variant="secondary" className="text-xs font-normal">
                        Learned {formatLearnedAt(s.createdAt)}
                      </Badge>
                    </div>
                    {s.description && (
                      <p className="text-sm text-muted-foreground">
                        {s.description}
                      </p>
                    )}
                    <div className="mt-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Steps
                      </span>
                      {(() => {
                        const lines = s.steps
                          .split(/\n+/)
                          .map((line) => line.replace(/^\s*[\d.)\-*]+\s*/, "").trim())
                          .filter(Boolean);
                        if (lines.length === 0) {
                          return (
                            <pre className="mt-1 whitespace-pre-wrap rounded bg-muted/50 px-3 py-2 text-xs text-foreground">
                              {s.steps}
                            </pre>
                          );
                        }
                        return (
                          <ol className="mt-1 list-inside list-decimal space-y-1 rounded bg-muted/50 px-3 py-2 text-sm text-foreground">
                            {lines.map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ol>
                        );
                      })()}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(s.createdAt).toLocaleString()}
                    </p>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
