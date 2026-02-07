"use client";

import { History, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useHistoryStore } from "@/stores/use-history-store";
import { useProjectStore } from "@/stores/use-project-store";
import { useState, useMemo } from "react";

export default function HistoryPage() {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const items = useHistoryStore((s) =>
    s.getByProject(activeProjectId ?? "")
  );
  const clearHistory = useHistoryStore((s) => s.clearHistory);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.query.toLowerCase().includes(q) ||
        i.summary.toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-border px-4">
        <h1 className="font-semibold text-foreground">History</h1>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search history…"
              className="pl-8"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearHistory()}
            disabled={items.length === 0}
            className="text-muted-foreground"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear history
          </Button>
        </div>
      </header>
      <div className="flex-1 overflow-auto p-4">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-muted-foreground">
            <History className="mx-auto h-12 w-12 opacity-50" />
            <p className="mt-2 font-medium">No history yet</p>
            <p className="mt-1 text-sm">
              Conversations and runs will appear here.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((h) => (
              <li key={h.id}>
                <Card className="p-4">
                  <p className="font-medium text-foreground">{h.query}</p>
                  {h.summary && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {h.summary}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(h.timestamp).toLocaleString()}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
