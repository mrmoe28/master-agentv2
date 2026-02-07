"use client";

import { Plus, FolderOpen, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";
import { useProjectStore } from "@/stores/use-project-store";
import { useAgentStore } from "@/stores/use-agent-store";
import { useTaskStore } from "@/stores/use-task-store";
import { useHistoryStore } from "@/stores/use-history-store";
import { useMemoryStore } from "@/stores/use-memory-store";
import { CreateProjectDialog } from "@/components/dialogs/create-project-dialog";
import { useState, useMemo } from "react";
import type { SidebarView } from "@/stores/use-ui-store";

interface SidebarContentProps {
  view: SidebarView;
  collapsed: boolean;
  projects: Project[];
  activeProjectId: string | null;
  activeProject: Project | null;
}

export function SidebarContent({
  view,
  collapsed,
  projects,
  activeProjectId,
  activeProject: _activeProject,
}: SidebarContentProps) {
  const { setActiveProject } = useProjectStore();
  const agents = useAgentStore((s) => s.getAgentsByProject(activeProjectId ?? ""));
  const tasks = useTaskStore((s) => s.getTasksByProject(activeProjectId ?? ""));
  const historyItems = useHistoryStore((s) =>
    s.getByProject(activeProjectId ?? "")
  );
  const memories = useMemoryStore((s) => s.memories);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState("");

  // useMemo must be called unconditionally (React hooks rule)
  const historySearchResults = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return historyItems;
    return historyItems.filter(
      (h) =>
        h.query.toLowerCase().includes(q) ||
        h.summary.toLowerCase().includes(q)
    );
  }, [historySearch, historyItems]);

  if (collapsed) return null;

  if (view === "projects") {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Projects
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setCreateProjectOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <ul className="space-y-0.5">
          {projects.map((p) => (
            <li key={p.id}>
              <Button
                variant={activeProjectId === p.id ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => setActiveProject(p.id)}
              >
                <FolderOpen className="h-4 w-4 shrink-0" />
                <span className="truncate">{p.name}</span>
              </Button>
            </li>
          ))}
        </ul>
        <CreateProjectDialog
          open={createProjectOpen}
          onOpenChange={setCreateProjectOpen}
        />
      </div>
    );
  }

  if (view === "agents") {
    return (
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground">
          Agents ({agents.length})
        </span>
        <ul className="space-y-0.5">
          {agents.slice(0, 10).map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
            >
              <span className="truncate">{a.name}</span>
              <span
                className={cn(
                  "ml-auto h-2 w-2 rounded-full",
                  a.status === "running" && "bg-emerald-500",
                  a.status === "thinking" && "bg-amber-500 animate-pulse",
                  a.status === "idle" && "bg-muted-foreground/50",
                  a.status === "done" && "bg-primary"
                )}
              />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (view === "tasks") {
    return (
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground">
          Tasks ({tasks.length})
        </span>
        <ul className="space-y-0.5">
          {tasks.slice(0, 8).map((t) => (
            <li
              key={t.id}
              className="rounded-md px-2 py-1.5 text-sm text-muted-foreground"
            >
              <span className="truncate block">{t.title}</span>
              <span className="text-xs text-muted-foreground/80">{t.status}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (view === "history") {
    const sortedHistory = [...historySearchResults].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const formatHistoryTimestamp = (ts: string) =>
      new Date(ts).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    return (
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground">
          Chat history
        </span>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            placeholder="Search history…"
            className="h-8 pl-8 text-xs"
          />
        </div>
        <ul className="space-y-0.5 min-w-0">
          {sortedHistory.slice(0, 12).map((h) => (
            <li
              key={h.id}
              className="rounded-md px-2 py-1.5 text-xs text-muted-foreground min-w-0 break-words"
            >
              <span className="block text-foreground break-words">
                {h.query}
              </span>
              {h.summary && (
                <span className="mt-0.5 block text-muted-foreground/80 break-words">
                  {h.summary}
                </span>
              )}
              <span className="mt-0.5 block text-[10px] text-muted-foreground/70 shrink-0">
                {formatHistoryTimestamp(h.timestamp)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (view === "memory") {
    return (
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground">
          Memories ({memories.length})
        </span>
        <ul className="space-y-0.5">
          {memories.slice(0, 5).map((m) => (
            <li
              key={m.id}
              className="rounded-md px-2 py-1.5 text-xs text-muted-foreground"
            >
              <span className="truncate block">{m.content}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (view === "skills") {
    return (
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground">
          Skills
        </span>
        <p className="text-xs text-muted-foreground">
          Stored procedures the agent can follow.
        </p>
      </div>
    );
  }

  if (view === "integrations") {
    return (
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground">
          Integrations
        </span>
        <p className="text-xs text-muted-foreground">
          Connect APIs, tools, and data sources.
        </p>
      </div>
    );
  }

  if (view === "settings") {
    return (
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground">
          Settings
        </span>
        <p className="text-xs text-muted-foreground">
          Model, API keys, and preferences.
        </p>
      </div>
    );
  }

  return null;
}
