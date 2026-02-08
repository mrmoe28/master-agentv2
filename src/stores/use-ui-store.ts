import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SidebarView =
  | "projects"
  | "agents"
  | "tasks"
  | "history"
  | "memory"
  | "skills"
  | "integrations"
  | "docs"
  | "settings";

type RightPanelTab = "tasks" | "logs" | "agents" | "memory";

const SIDEBAR_WIDTH_MIN = 200;
const SIDEBAR_WIDTH_MAX = 480;
const SIDEBAR_WIDTH_DEFAULT = 224; // w-56

interface UIState {
  sidebarView: SidebarView;
  setSidebarView: (view: SidebarView) => void;
  rightPanelTab: RightPanelTab;
  setRightPanelTab: (tab: RightPanelTab) => void;
  rightPanelOpen: boolean;
  setRightPanelOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  isRunning: boolean;
  setIsRunning: (running: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarView: "projects",
      setSidebarView: (view) => set({ sidebarView: view }),
      rightPanelTab: "tasks",
      setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
      rightPanelOpen: true,
      setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      sidebarWidth: SIDEBAR_WIDTH_DEFAULT,
      setSidebarWidth: (width) =>
        set({
          sidebarWidth: Math.min(
            SIDEBAR_WIDTH_MAX,
            Math.max(SIDEBAR_WIDTH_MIN, width)
          ),
        }),
      darkMode: true,
      setDarkMode: (dark) => set({ darkMode: dark }),
      isRunning: false,
      setIsRunning: (running) => set({ isRunning: running }),
    }),
    { name: "master-agent-ui", partialize: (s) => ({
        darkMode: s.darkMode,
        sidebarCollapsed: s.sidebarCollapsed,
        sidebarWidth: s.sidebarWidth,
      }) }
  )
);
