"use client";

import {
  MessageSquare,
  FolderKanban,
  Bot,
  ListTodo,
  History,
  Brain,
  BookOpen,
  Plug,
  Settings,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useUIStore } from "@/stores/use-ui-store";
import { useProjectStore } from "@/stores/use-project-store";
import { SidebarContent } from "./sidebar-content";
import type { SidebarView } from "@/stores/use-ui-store";

const navItems: { path: string; id: SidebarView; label: string; icon: typeof FolderKanban }[] = [
  { path: "/", id: "projects", label: "Chat", icon: MessageSquare },
  { path: "/projects", id: "projects", label: "Projects", icon: FolderKanban },
  { path: "/agents", id: "agents", label: "Agents", icon: Bot },
  { path: "/tasks", id: "tasks", label: "Tasks", icon: ListTodo },
  { path: "/history", id: "history", label: "History", icon: History },
  { path: "/memory", id: "memory", label: "Memory", icon: Brain },
  { path: "/skills", id: "skills", label: "Skills", icon: BookOpen },
  { path: "/integrations", id: "integrations", label: "Integrations", icon: Plug },
  { path: "/settings", id: "settings", label: "Settings", icon: Settings },
];

function sidebarViewFromPath(pathname: string): SidebarView {
  if (pathname === "/") return "projects";
  const segment = pathname.slice(1).split("/")[0];
  const match = navItems.find((item) => item.path === `/${segment}`);
  return (match?.id ?? "projects") as SidebarView;
}

export function Sidebar() {
  const pathname = usePathname();
  const asideRef = useRef<HTMLElement>(null);
  const {
    sidebarCollapsed,
    setSidebarCollapsed,
    setSidebarView,
    sidebarWidth,
    setSidebarWidth,
  } = useUIStore();
  const sidebarView = sidebarViewFromPath(pathname);
  const { projects, activeProjectId, getProject } = useProjectStore();
  const activeProject = activeProjectId ? getProject(activeProjectId) : null;

  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current;
      setSidebarWidth(startWidthRef.current + delta);
    },
    [setSidebarWidth]
  );
  const handleResizeEnd = useCallback(() => {
    window.removeEventListener("mousemove", handleResizeMove);
    window.removeEventListener("mouseup", handleResizeEnd);
  }, [handleResizeMove]);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (sidebarCollapsed) return;
      e.preventDefault();
      const el = asideRef.current;
      if (!el) return;
      startXRef.current = e.clientX;
      startWidthRef.current = el.getBoundingClientRect().width;
      window.addEventListener("mousemove", handleResizeMove);
      window.addEventListener("mouseup", handleResizeEnd);
    },
    [sidebarCollapsed, handleResizeMove, handleResizeEnd]
  );

  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", handleResizeMove);
      window.removeEventListener("mouseup", handleResizeEnd);
    };
  }, [handleResizeMove, handleResizeEnd]);

  return (
    <aside
      ref={asideRef}
      className={cn(
        "relative flex h-full flex-col border-r border-border bg-card shrink-0",
        !sidebarCollapsed && "transition-[width] duration-200"
      )}
      style={
        sidebarCollapsed
          ? { width: 52, minWidth: 52 }
          : { width: sidebarWidth, minWidth: sidebarWidth }
      }
    >
      {/* Invisible resize handle on the right edge */}
      {!sidebarCollapsed && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize -mr-px z-10"
          onMouseDown={handleResizeStart}
        />
      )}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
        {!sidebarCollapsed && (
          <>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <span className="font-semibold text-foreground">
                Master Agent
              </span>
            </div>
          </>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-auto"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          <ChevronLeft
            className={cn("h-4 w-4", sidebarCollapsed && "rotate-180")}
          />
        </Button>
      </div>
      <ScrollArea className="flex-1 scrollbar-thin">
        <nav className="flex flex-col gap-0.5 p-2">
          {navItems.map(({ path, id, label, icon: Icon }) => {
            const isActive = pathname === path;
            return (
              <Button
                key={path}
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "justify-start gap-2 min-w-0",
                  sidebarCollapsed && "justify-center px-0"
                )}
                asChild
              >
                <Link
                  href={path}
                  onClick={() => setSidebarView(id)}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{label}</span>}
                </Link>
              </Button>
            );
          })}
        </nav>
        <Separator className="my-2" />
        <div className="px-2 pb-2">
          <SidebarContent
            view={sidebarView}
            collapsed={sidebarCollapsed}
            projects={projects}
            activeProjectId={activeProjectId}
            activeProject={activeProject ?? null}
          />
        </div>
      </ScrollArea>
    </aside>
  );
}
