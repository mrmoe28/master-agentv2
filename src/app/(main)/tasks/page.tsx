"use client";

import { ListTodo, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTaskStore } from "@/stores/use-task-store";
import { useProjectStore } from "@/stores/use-project-store";

export default function TasksPage() {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const tasks = useTaskStore((s) =>
    s.getTasksByProject(activeProjectId ?? "")
  );
  const clearTasksForProject = useTaskStore((s) => s.clearTasksForProject);

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-border px-4">
        <h1 className="font-semibold text-foreground">Tasks</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => activeProjectId && clearTasksForProject(activeProjectId)}
          disabled={!activeProjectId || tasks.length === 0}
          className="text-muted-foreground"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Clear tasks
        </Button>
      </header>
      <div className="flex-1 overflow-auto p-4">
        {tasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-muted-foreground">
            <ListTodo className="mx-auto h-12 w-12 opacity-50" />
            <p className="mt-2 font-medium">No tasks yet</p>
            <p className="mt-1 text-sm">
              Start an autonomous run from the Chat page to see tasks here.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {tasks.map((t) => (
              <li key={t.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{t.title}</p>
                      {t.result && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {t.result}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {new Date(t.createdAt).toLocaleString()}
                        </span>
                        {t.completedAt && (
                          <>
                            <span>→</span>
                            <span>
                              {new Date(t.completedAt).toLocaleString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={
                        t.status === "completed"
                          ? "success"
                          : t.status === "failed"
                            ? "destructive"
                            : "secondary"
                      }
                      className="shrink-0"
                    >
                      {t.status}
                    </Badge>
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
