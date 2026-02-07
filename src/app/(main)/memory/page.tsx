"use client";

import { Brain, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMemoryStore } from "@/stores/use-memory-store";

export default function MemoryPage() {
  const memories = useMemoryStore((s) => s.memories);
  const clearMemories = useMemoryStore((s) => s.clearMemories);
  const removeMemory = useMemoryStore((s) => s.removeMemory);

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-border px-4">
        <h1 className="font-semibold text-foreground">Memory</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => clearMemories()}
          disabled={memories.length === 0}
          className="text-muted-foreground"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Clear all
        </Button>
      </header>
      <div className="flex-1 overflow-auto p-4">
        {memories.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-muted-foreground">
            <Brain className="mx-auto h-12 w-12 opacity-50" />
            <p className="mt-2 font-medium">No memories yet</p>
            <p className="mt-1 text-sm">
              Retrieved context and preferences will appear here.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {memories.map((m) => (
              <li key={m.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Badge variant="outline" className="mb-2 text-xs">
                        {m.type}
                      </Badge>
                      <p className="text-sm text-foreground">{m.content}</p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        {m.score !== undefined && (
                          <span>score: {m.score.toFixed(2)}</span>
                        )}
                        <span>{new Date(m.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeMemory(m.id)}
                      aria-label="Delete memory"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
