"use client";

import { ListTodo, FileText, GitBranch, Brain, PanelRightClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useUIStore } from "@/stores/use-ui-store";
import { useProjectStore } from "@/stores/use-project-store";
import { useTaskStore } from "@/stores/use-task-store";
import { useLogStore } from "@/stores/use-log-store";
import { useAgentStore } from "@/stores/use-agent-store";
import { useMemoryStore } from "@/stores/use-memory-store";
import { cn } from "@/lib/utils";

export function RightPanel() {
  const {
    rightPanelOpen,
    setRightPanelOpen,
    rightPanelTab,
    setRightPanelTab,
  } = useUIStore();
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const tasks = useTaskStore((s) =>
    s.getActiveTasks(activeProjectId ?? "")
  );
  const allTasks = useTaskStore((s) =>
    s.getTasksByProject(activeProjectId ?? "")
  );
  const logs = useLogStore((s) => s.logs);
  const agents = useAgentStore((s) =>
    s.getAgentsByProject(activeProjectId ?? "")
  );
  const memories = useMemoryStore((s) => s.memories);

  if (!rightPanelOpen) {
    return (
      <div className="flex w-10 flex-col items-center border-l border-border bg-card py-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setRightPanelOpen(true)}
          title="Open panel"
        >
          <PanelRightClose className="h-4 w-4 rotate-180" />
        </Button>
      </div>
    );
  }

  return (
    <aside className="flex h-full w-80 flex-col border-l border-border bg-card overflow-hidden">
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border px-2">
        <Tabs
          value={rightPanelTab}
          onValueChange={(v) => setRightPanelTab(v as typeof rightPanelTab)}
          className="flex-1 min-w-0"
        >
          <TabsList className="h-8 w-full grid grid-cols-4">
            <TabsTrigger value="tasks" className="gap-1 text-xs px-1">
              <ListTodo className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Tasks</span>
              {tasks.length > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {tasks.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1 text-xs px-1">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Logs</span>
            </TabsTrigger>
            <TabsTrigger value="agents" className="gap-1 text-xs px-1">
              <GitBranch className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Agents</span>
            </TabsTrigger>
            <TabsTrigger value="memory" className="gap-1 text-xs px-1">
              <Brain className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Memory</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setRightPanelOpen(false)}
          title="Close panel"
        >
          <PanelRightClose className="h-4 w-4" />
        </Button>
      </div>
      <Tabs
        value={rightPanelTab}
        onValueChange={(v) => setRightPanelTab(v as typeof rightPanelTab)}
        className="flex flex-1 min-h-0 flex-col overflow-hidden"
      >
          <TabsContent value="tasks" className="mt-0 flex-1 min-h-0 overflow-hidden data-[state=inactive]:hidden flex flex-col">
            <ScrollArea className="flex-1 scrollbar-thin">
          <div className="p-3 space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground">
              Task timeline
            </h3>
            {allTasks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
                <p className="text-xs text-muted-foreground">
                  No tasks yet. Start a run to see tasks here.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {allTasks.slice(0, 20).map((t) => (
                  <li
                    key={t.id}
                    className="rounded-md border border-border bg-background/50 p-2 text-xs"
                  >
                    <div className="font-medium truncate">{t.title}</div>
                    <div className="mt-1 flex items-center gap-1">
                      <Badge
                        variant={
                          t.status === "completed"
                            ? "success"
                            : t.status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-[10px]"
                      >
                        {t.status}
                      </Badge>
                      {t.completedAt && (
                        <span className="text-muted-foreground">
                          {new Date(t.completedAt).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    {t.result && (
                      <p className="mt-1 text-muted-foreground truncate">
                        {t.result}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          </ScrollArea>
          </TabsContent>
          <TabsContent value="logs" className="mt-0 flex-1 min-h-0 overflow-hidden data-[state=inactive]:hidden flex flex-col">
          <ScrollArea className="flex-1 scrollbar-thin">
          <div className="p-3 space-y-1 font-mono text-xs">
            <h3 className="text-xs font-medium text-muted-foreground mb-2">
              Logs
            </h3>
            {logs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
                <p className="text-xs text-muted-foreground">No logs yet.</p>
              </div>
            ) : (
              [...logs].reverse().slice(0, 100).map((l) => (
                <div
                  key={l.id}
                  className={cn(
                    "rounded px-2 py-1",
                    l.level === "error" && "text-destructive",
                    l.level === "warn" && "text-amber-600 dark:text-amber-400",
                    l.level === "debug" && "text-muted-foreground"
                  )}
                >
                  <span className="text-muted-foreground">
                    {new Date(l.timestamp).toLocaleTimeString()}
                  </span>{" "}
                  [{l.level}] {l.message}
                </div>
              ))
            )}
          </div>
          </ScrollArea>
          </TabsContent>
          <TabsContent value="agents" className="mt-0 flex-1 min-h-0 overflow-hidden data-[state=inactive]:hidden flex flex-col">
          <ScrollArea className="flex-1 scrollbar-thin">
          <div className="p-3 space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground">
              Sub-agent tree
            </h3>
            {agents.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
                <p className="text-xs text-muted-foreground">
                  No agents spawned yet.
                </p>
              </div>
            ) : (
              <AgentTree agents={agents} parentId={null} />
            )}
          </div>
          </ScrollArea>
          </TabsContent>
          <TabsContent value="memory" className="mt-0 flex-1 min-h-0 overflow-hidden data-[state=inactive]:hidden flex flex-col">
          <ScrollArea className="flex-1 scrollbar-thin">
          <div className="p-3 space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground">
              Memory retrievals
            </h3>
            {memories.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
                <p className="text-xs text-muted-foreground">
                  No memories loaded.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {memories.slice(0, 15).map((m) => (
                  <li
                    key={m.id}
                    className="rounded-md border border-border bg-background/50 p-2 text-xs"
                  >
                    <Badge variant="outline" className="mb-1 text-[10px]">
                      {m.type}
                    </Badge>
                    <p className="text-foreground">{m.content}</p>
                    {m.score !== undefined && (
                      <span className="text-muted-foreground">
                        score: {m.score.toFixed(2)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          </ScrollArea>
          </TabsContent>
        </Tabs>
    </aside>
  );
}

function AgentTree({
  agents,
  parentId,
}: {
  agents: { id: string; name: string; role: string; status: string; parentId: string | null }[];
  parentId: string | null;
}) {
  const children = agents.filter((a) => a.parentId === parentId);
  if (children.length === 0) return null;
  return (
    <ul className="space-y-1 pl-2 border-l-2 border-border ml-1">
      {children.map((a) => (
        <li key={a.id} className="text-xs">
          <div className="flex items-center gap-1">
            <span
              className={cn(
                "h-2 w-2 rounded-full shrink-0",
                a.status === "running" && "bg-emerald-500",
                a.status === "thinking" && "bg-amber-500 animate-pulse",
                a.status === "done" && "bg-primary",
                a.status === "idle" && "bg-muted-foreground/50"
              )}
            />
            <span className="font-medium">{a.name}</span>
            <Badge variant="outline" className="text-[10px]">
              {a.status}
            </Badge>
          </div>
          <AgentTree agents={agents} parentId={a.id} />
        </li>
      ))}
    </ul>
  );
}
