import { create } from "zustand";
import type { HistoryItem } from "@/types";

interface HistoryState {
  items: HistoryItem[];
  addItem: (item: HistoryItem) => void;
  getByProject: (projectId: string) => HistoryItem[];
  search: (query: string) => HistoryItem[];
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  items: [],
  addItem: (item) =>
    set((state) => ({ items: [item, ...state.items].slice(0, 200) })),
  getByProject: (projectId) =>
    get().items.filter((i) => i.projectId === projectId),
  search: (query) => {
    const q = query.toLowerCase();
    return get().items.filter(
      (i) =>
        i.query.toLowerCase().includes(q) || i.summary.toLowerCase().includes(q)
    );
  },
  clearHistory: () => set({ items: [] }),
}));
