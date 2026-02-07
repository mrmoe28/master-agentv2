"use client";

import Link from "next/link";
import { Bot, GitBranch, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAgentStore } from "@/stores/use-agent-store";
import { useProjectStore } from "@/stores/use-project-store";
import { cn } from "@/lib/utils";

function AgentCard({
  id,
  name,
  role,
  status,
  parentId,
}: {
  id: string;
  name: string;
  role: string;
  status: string;
  parentId: string | null;
}) {
  const statusColor =
    status === "running"
      ? "bg-emerald-500"
      : status === "thinking"
        ? "bg-amber-500 animate-pulse"
        : status === "done"
          ? "bg-primary"
          : "bg-muted-foreground/50";

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span
          className={cn("h-3 w-3 shrink-0 rounded-full", statusColor)}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{name}</p>
          <p className="text-sm text-muted-foreground">{role}</p>
        </div>
        <Badge variant="secondary" className="shrink-0">
          {status}
        </Badge>
      </div>
    </Card>
  );
}

export default function AgentsPage() {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const agents = useAgentStore((s) =>
    s.getAgentsByProject(activeProjectId ?? "")
  );

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-border px-4">
        <h1 className="font-semibold text-foreground">Agents</h1>
        <Button size="sm" variant="outline" asChild>
          <Link href="/">
            <MessageSquare className="mr-2 h-4 w-4" />
            Go to Chat
          </Link>
        </Button>
      </header>
      <div className="flex-1 overflow-auto p-4">
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <GitBranch className="h-4 w-4" />
          <span>Sub-agent tree for current project</span>
        </div>
        {agents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-muted-foreground">
            <Bot className="mx-auto h-12 w-12 opacity-50" />
            <p className="mt-2 font-medium">No agents yet</p>
            <p className="mt-1 text-sm">
              Start an autonomous run from the Chat page to spawn agents.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {agents.map((a) => (
              <AgentCard
                key={a.id}
                id={a.id}
                name={a.name}
                role={a.role}
                status={a.status}
                parentId={a.parentId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
