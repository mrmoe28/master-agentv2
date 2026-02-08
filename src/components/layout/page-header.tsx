"use client";

import { ChevronLeft, ListTodo, FileText, GitBranch } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/use-ui-store";
import { LiveClock } from "@/components/layout/live-clock";
import { cn } from "@/lib/utils";

type RightPanelTab = "tasks" | "logs" | "agents" | "memory";

const panelButtons: { tab: RightPanelTab; label: string; icon: typeof ListTodo }[] = [
  { tab: "tasks", label: "Tasks", icon: ListTodo },
  { tab: "logs", label: "Logs", icon: FileText },
  { tab: "agents", label: "Agents", icon: GitBranch },
];

interface PageHeaderProps {
  title: string;
  showPanelButtons?: boolean;
  className?: string;
}

export function PageHeader({ title, showPanelButtons = true, className }: PageHeaderProps) {
  const { setRightPanelOpen, setRightPanelTab } = useUIStore();

  const handlePanelTab = (tab: RightPanelTab) => {
    setRightPanelTab(tab);
    setRightPanelOpen(true);
  };

  return (
    <header
      className={cn(
        "flex h-12 shrink-0 items-center justify-between gap-4 border-b border-border px-4",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="icon-sm" className="shrink-0" asChild>
          <Link href="/" aria-label="Back">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="truncate font-semibold text-foreground">{title}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {showPanelButtons && (
          <>
            {panelButtons.map(({ tab, label, icon: Icon }) => (
              <Button
                key={tab}
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={() => handlePanelTab(tab)}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </Button>
            ))}
          </>
        )}
        <LiveClock />
      </div>
    </header>
  );
}
