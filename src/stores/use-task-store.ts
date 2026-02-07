import { create } from "zustand";
import type { Task } from "@/types";

interface TaskState {
  tasks: Task[];
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  getTasksByProject: (projectId: string) => Task[];
  getActiveTasks: (projectId: string) => Task[];
  clearTasksForProject: (projectId: string) => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  addTask: (task) =>
    set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),
  getTasksByProject: (projectId) =>
    get().tasks.filter((t) => t.projectId === projectId),
  getActiveTasks: (projectId) =>
    get().tasks.filter(
      (t) =>
        t.projectId === projectId &&
        (t.status === "pending" || t.status === "in_progress")
    ),
  clearTasksForProject: (projectId) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.projectId !== projectId),
    })),
}));
