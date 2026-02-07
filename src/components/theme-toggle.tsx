"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/use-ui-store";

export function ThemeToggle() {
  const { darkMode, setDarkMode } = useUIStore();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="relative"
      onClick={() => setDarkMode(!darkMode)}
      title={darkMode ? "Light mode" : "Dark mode"}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
