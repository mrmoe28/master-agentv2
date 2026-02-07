import { create } from "zustand";
import type { Agent } from "@/types";

interface AgentState {
  agents: Agent[];
  addAgent: (agent: Agent) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  removeAgent: (id: string) => void;
  getAgentsByProject: (projectId: string) => Agent[];
  getSubAgents: (parentId: string) => Agent[];
  clearAgentsForProject: (projectId: string) => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [
    {
      id: "agent-master",
      name: "Master Agent",
      role: "Orchestrator",
      status: "idle",
      parentId: null,
      projectId: "proj-1",
      createdAt: new Date().toISOString(),
    },
  ],
  addAgent: (agent) =>
    set((state) => ({ agents: [...state.agents, agent] })),
  updateAgent: (id, updates) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    })),
  removeAgent: (id) =>
    set((state) => ({ agents: state.agents.filter((a) => a.id !== id) })),
  getAgentsByProject: (projectId) =>
    get().agents.filter((a) => a.projectId === projectId),
  getSubAgents: (parentId) =>
    get().agents.filter((a) => a.parentId === parentId),
  clearAgentsForProject: (projectId) =>
    set((state) => ({
      agents: state.agents.filter((a) => a.projectId !== projectId),
    })),
}));
