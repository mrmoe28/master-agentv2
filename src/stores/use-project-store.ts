import { create } from "zustand";
import type { Project } from "@/types";

interface ProjectState {
  projects: Project[];
  activeProjectId: string | null;
  setActiveProject: (id: string | null) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;
  getProject: (id: string) => Project | undefined;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [
    {
      id: "proj-1",
      name: "Default Project",
      description: "Master Agent control project",
      goals: ["Respond to user requests", "Delegate to sub-agents when needed"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  activeProjectId: "proj-1",
  setActiveProject: (id) => set({ activeProjectId: id }),
  addProject: (project) =>
    set((state) => ({ projects: [...state.projects, project] })),
  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      ),
    })),
  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
    })),
  getProject: (id) => get().projects.find((p) => p.id === id),
}));
