import { create } from "zustand";
import type { MemoryItem } from "@/types";

interface MemoryState {
  memories: MemoryItem[];
  addMemory: (item: MemoryItem) => void;
  setMemories: (items: MemoryItem[]) => void;
  removeMemory: (id: string) => void;
  clearMemories: () => void;
}

export const useMemoryStore = create<MemoryState>((set) => ({
  memories: [
    {
      id: "mem-1",
      content: "User prefers concise responses.",
      type: "preference",
      timestamp: new Date().toISOString(),
    },
    {
      id: "mem-2",
      content: "Project context: Master Agent OS dashboard.",
      type: "context",
      timestamp: new Date().toISOString(),
    },
  ],
  addMemory: (item) =>
    set((state) => ({ memories: [...state.memories, item] })),
  setMemories: (items) => set({ memories: items }),
  removeMemory: (id) =>
    set((state) => ({
      memories: state.memories.filter((m) => m.id !== id),
    })),
  clearMemories: () => set({ memories: [] }),
}));
