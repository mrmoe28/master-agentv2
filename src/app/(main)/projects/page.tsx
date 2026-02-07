"use client";

import Link from "next/link";
import {
  FolderOpen,
  FolderKanban,
  Plus,
  MessageSquare,
  MoreHorizontal,
  Target,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProjectStore } from "@/stores/use-project-store";
import { CreateProjectDialog } from "@/components/dialogs/create-project-dialog";
import { AssignGoalsDialog } from "@/components/dialogs/assign-goals-dialog";
import { useState } from "react";

export default function ProjectsPage() {
  const {
    projects,
    activeProjectId,
    setActiveProject,
    removeProject,
  } = useProjectStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [goalsProjectId, setGoalsProjectId] = useState<string | null>(null);
  const activeProject = activeProjectId
    ? projects.find((p) => p.id === activeProjectId)
    : null;
  const projectForGoals =
    goalsProjectId != null
      ? projects.find((p) => p.id === goalsProjectId)
      : activeProject;

  const openGoalsFor = (projectId: string) => {
    setGoalsProjectId(projectId);
    setGoalsOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`Delete project "${name}"? This cannot be undone.`)) {
      removeProject(id);
      if (goalsProjectId === id) setGoalsProjectId(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-border px-4">
        <h1 className="font-semibold text-foreground">Projects</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href="/">
              <MessageSquare className="mr-2 h-4 w-4" />
              Go to Chat
            </Link>
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New project
          </Button>
        </div>
      </header>
      <div className="flex-1 overflow-auto p-4">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
            <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 font-medium text-foreground">No projects yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Create a project to organize goals and chat sessions. Assign goals in the sidebar or from here, then run the agent from Chat.
            </p>
            <Button
              size="sm"
              className="mt-4"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              New project
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <Card
                  key={p.id}
                  className={`cursor-pointer transition-colors hover:border-primary/50 ${
                    activeProjectId === p.id
                      ? "border-primary bg-primary/5"
                      : ""
                  }`}
                  onClick={() => setActiveProject(p.id)}
                >
                  <div className="flex items-start gap-3 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <FolderOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-medium truncate">{p.name}</h3>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="h-7 w-7 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                openGoalsFor(p.id);
                              }}
                            >
                              <Target className="mr-2 h-4 w-4" />
                              Edit goals
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => handleDelete(e, p.id, p.name)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                        {p.description || "No description"}
                      </p>
                      {p.goals.length > 0 && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {p.goals.length} goal{p.goals.length !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            {activeProject && (
              <div className="mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openGoalsFor(activeProject.id)}
                >
                  <Target className="mr-2 h-4 w-4" />
                  Edit goals for {activeProject.name}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
      <AssignGoalsDialog
        open={goalsOpen}
        onOpenChange={(open) => {
          if (!open) setGoalsProjectId(null);
          setGoalsOpen(open);
        }}
        project={projectForGoals ?? undefined}
      />
    </div>
  );
}
