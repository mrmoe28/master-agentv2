"use client";

import * as React from "react";
import { useUIStore } from "@/stores/use-ui-store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const darkMode = useUIStore((s) => s.darkMode);

  React.useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [darkMode]);

  return <>{children}</>;
}
