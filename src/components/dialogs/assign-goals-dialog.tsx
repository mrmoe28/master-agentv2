"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useProjectStore } from "@/stores/use-project-store";
import type { Project } from "@/types";

interface AssignGoalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
}

export function AssignGoalsDialog({
  open,
  onOpenChange,
  project,
}: AssignGoalsDialogProps) {
  const [goalsText, setGoalsText] = useState("");
  const updateProject = useProjectStore((s) => s.updateProject);

  useEffect(() => {
    if (project) {
      setGoalsText(project.goals.join("\n"));
    }
  }, [project, open]);

  const handleSave = () => {
    if (!project) return;
    const goals = goalsText
      .split("\n")
      .map((g) => g.trim())
      .filter(Boolean);
    updateProject(project.id, { goals });
    onOpenChange(false);
  };

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign goals</DialogTitle>
          <DialogDescription>
            Set or edit goals for &quot;{project.name}&quot;. The master agent will work toward these when you start a run.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium">Goals (one per line)</label>
          <Textarea
            value={goalsText}
            onChange={(e) => setGoalsText(e.target.value)}
            placeholder="Goal 1&#10;Goal 2"
            rows={5}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
