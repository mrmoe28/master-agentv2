"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Send, Loader2, Play, Trash2, X, Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatStore } from "@/stores/use-chat-store";
import { useProjectStore } from "@/stores/use-project-store";
import { useUIStore } from "@/stores/use-ui-store";
import { useAgentStore } from "@/stores/use-agent-store";
import { useTaskStore } from "@/stores/use-task-store";
import { useLogStore } from "@/stores/use-log-store";
import { useHistoryStore } from "@/stores/use-history-store";
import { cn } from "@/lib/utils";
import { ChatMessageBubble } from "@/components/chat/chat-message-bubble";
import { AssignGoalsDialog } from "@/components/dialogs/assign-goals-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { extractTextFromPdf } from "@/lib/pdf-extract";
import type { FileAttachment } from "@/types";

const MAX_PASTED_IMAGES = 4;
const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB for PDF/CSV
const ACCEPTED_FILE_TYPES = ".pdf,.csv,application/pdf,text/csv";

interface AttachedFile {
  id: string;
  file: File;
  name: string;
  mimeType: string;
  extractedText?: string;
  blobUrl?: string;
  error?: string;
  extracting?: boolean;
}

export function ChatArea() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [pastedImages, setPastedImages] = useState<string[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);
  const addMessage = useChatStore((s) => s.addMessage);
  const setLoading = useChatStore((s) => s.setLoading);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const getProject = useProjectStore((s) => s.getProject);
  const { isRunning, setIsRunning } = useUIStore();
  const addAgent = useAgentStore((s) => s.addAgent);
  const updateAgent = useAgentStore((s) => s.updateAgent);
  const addTask = useTaskStore((s) => s.addTask);
  const updateTask = useTaskStore((s) => s.updateTask);
  const addLog = useLogStore((s) => s.addLog);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const [goalsDialogOpen, setGoalsDialogOpen] = useState(false);
  const activeProject = activeProjectId ? getProject(activeProjectId) : null;

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addPastedImage = useCallback((dataUrl: string) => {
    setPastedImages((prev) => {
      if (prev.length >= MAX_PASTED_IMAGES) return prev;
      return [...prev, dataUrl];
    });
  }, []);

  const removePastedImage = useCallback((index: number) => {
    setPastedImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const readCsvAsText = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file, "utf-8");
    });

  const processFile = useCallback(async (file: File): Promise<AttachedFile> => {
    const id = `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const name = file.name;
    const mimeType = file.type || (name.endsWith(".csv") ? "text/csv" : "application/pdf");
    const isPdf = mimeType === "application/pdf" || name.toLowerCase().endsWith(".pdf");
    const isCsv = mimeType === "text/csv" || name.toLowerCase().endsWith(".csv");
    const blobUrl = isPdf ? URL.createObjectURL(file) : undefined;

    const base: AttachedFile = {
      id,
      file,
      name,
      mimeType,
      blobUrl,
      extracting: true,
    };
    setAttachedFiles((prev) => [...prev, base]);

    try {
      let extractedText: string;
      if (isCsv) {
        extractedText = await readCsvAsText(file);
      } else if (isPdf) {
        const buf = await file.arrayBuffer();
        extractedText = await extractTextFromPdf(buf);
      } else {
        throw new Error("Unsupported file type. Use PDF or CSV.");
      }
      setAttachedFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, extractedText, extracting: false } : f
        )
      );
      return { ...base, extractedText, extracting: false };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setAttachedFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, error: message, extracting: false } : f
        )
      );
      return { ...base, error: message, extracting: false };
    }
  }, []);

  const onFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;
      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          setAttachedFiles((prev) =>
            prev.concat({
              id: `file-${Date.now()}`,
              file,
              name: file.name,
              mimeType: file.type,
              error: "File too large (max 10MB)",
              extracting: false,
            })
          );
          continue;
        }
        const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        const isCsv = file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv");
        if (!isPdf && !isCsv) continue;
        await processFile(file);
      }
      e.target.value = "";
    },
    [processFile]
  );

  const removeAttachedFile = useCallback((id: string) => {
    setAttachedFiles((prev) => {
      const next = prev.filter((f) => f.id !== id);
      const found = prev.find((f) => f.id === id);
      if (found?.blobUrl) URL.revokeObjectURL(found.blobUrl);
      return next;
    });
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.kind !== "file" || !item.type.startsWith("image/")) continue;
        e.preventDefault();
        const file = item.getAsFile();
        if (!file || file.size > MAX_IMAGE_SIZE_BYTES) continue;
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          if (dataUrl) addPastedImage(dataUrl);
        };
        reader.readAsDataURL(file);
        break;
      }
    },
    [addPastedImage]
  );

  const handleSend = async () => {
    const text = input.trim();
    const hasAttachments = attachedFiles.some(
      (f) => !f.error && (f.extractedText !== undefined || f.extracting)
    );
    if (!text && pastedImages.length === 0 && !hasAttachments) return;
    const filesToSend = attachedFiles.filter((f) => !f.error && f.extractedText !== undefined);
    if (attachedFiles.some((f) => f.extracting)) return;

    setInput("");
    const imagesToSend = [...pastedImages];
    setPastedImages([]);

    const fileAttachmentsForMessage: FileAttachment[] = filesToSend.map((f) => ({
      name: f.name,
      mimeType: f.mimeType,
      extractedText: f.extractedText,
      ...(f.blobUrl && { blobUrl: f.blobUrl }),
    }));

    let contentForSend = text || "";
    if (filesToSend.length > 0) {
      const fileBlocks = filesToSend.map((f) => {
        const raw = f.extractedText ?? "";
        const isCsv = f.name.toLowerCase().endsWith(".csv");
        if (!isCsv || !raw.trim()) {
          return `[Attached file: ${f.name}]\n${raw}`;
        }
        const lines = raw.split(/\r?\n/).filter((line) => line.trim());
        const headerLine = lines[0] ?? "";
        const columns = headerLine.split(",").map((c) => c.trim());
        const rowCount = Math.max(0, lines.length - 1);
        const schemaHint =
          columns.length > 0
            ? ` CSV columns: ${columns.join(", ")} (${rowCount} data rows). When listing or extracting, respond with a structured markdown table or JSON array using these column names.\n`
            : "";
        return `[Attached file: ${f.name}]${schemaHint}\n${raw}`;
      });
      contentForSend = contentForSend
        ? `${contentForSend}\n\n${fileBlocks.join("\n\n")}`
        : fileBlocks.join("\n\n");
    }
    if (!contentForSend && imagesToSend.length > 0) contentForSend = "(screenshot)";

    const userMsgId = `msg-${Date.now()}`;
    addMessage({
      id: userMsgId,
      role: "user",
      content: text || (filesToSend.length ? "See attached files." : "(screenshot)"),
      timestamp: new Date().toISOString(),
      ...(imagesToSend.length > 0 && { imageUrls: imagesToSend }),
      ...(fileAttachmentsForMessage.length > 0 && { fileAttachments: fileAttachmentsForMessage }),
    });
    setAttachedFiles((prev) => prev.filter((f) => !filesToSend.some((s) => s.id === f.id)));

    setLoading(true);
    const assistantId = `msg-${Date.now() + 1}`;
    addMessage({
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      isStreaming: true,
    });
    const history = useChatStore.getState().messages;
    const apiMessages = history
      .slice(0, -1)
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => {
        const isLastUser = m.id === userMsgId;
        const apiContent = isLastUser ? contentForSend : m.content;
        return {
          role: m.role,
          content: apiContent,
          ...(m.imageUrls?.length && { imageUrls: m.imageUrls }),
        };
      });
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });
      const text = await res.text();
      let data: { content?: string; error?: string };
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: text || `Request failed (${res.status})` };
      }
      if (!res.ok) {
        useChatStore.getState().updateMessage(assistantId, {
          content: data?.error ?? `Request failed (${res.status})`,
          isStreaming: false,
        });
        return;
      }
      const assistantContent = data?.content ?? "";
      useChatStore.getState().updateMessage(assistantId, {
        content: assistantContent,
        isStreaming: false,
      });
      const pid = useProjectStore.getState().activeProjectId;
      if (pid) {
        useHistoryStore.getState().addItem({
          id: `hist-${Date.now()}`,
          projectId: pid,
          sessionId: `session-${pid}`,
          query: text || (filesToSend.length ? "See attached files." : "(screenshot)"),
          summary: assistantContent.slice(0, 120).replace(/\s+/g, " ").trim() || "—",
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      useChatStore.getState().updateMessage(assistantId, {
        content: `Error: ${message}`,
        isStreaming: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartRun = () => {
    if (!activeProjectId) return;
    setIsRunning(true);
    addLog({
      id: `log-${Date.now()}`,
      level: "info",
      message: "Autonomous run started",
      timestamp: new Date().toISOString(),
    });
    const agentId = `agent-${Date.now()}`;
    addAgent({
      id: agentId,
      name: `Worker-${Date.now() % 1000}`,
      role: "Executor",
      status: "running",
      parentId: "agent-master",
      projectId: activeProjectId,
      createdAt: new Date().toISOString(),
    });
    const taskId = `task-${Date.now()}`;
    addTask({
      id: taskId,
      title: "Execute project goals",
      status: "in_progress",
      agentId,
      projectId: activeProjectId,
      createdAt: new Date().toISOString(),
    });
    setTimeout(() => {
      updateAgent(agentId, { status: "done" });
      updateTask(taskId, {
        status: "completed",
        result: "Goals executed successfully",
        completedAt: new Date().toISOString(),
      });
      addLog({
        id: `log-${Date.now()}`,
        level: "info",
        message: "Run completed",
        timestamp: new Date().toISOString(),
      });
      setIsRunning(false);
    }, 3000);
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex h-12 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium">
            {activeProject?.name ?? "No project"}
          </span>
          {activeProject && activeProject.goals.length > 0 && (
            <>
              <span className="text-muted-foreground" aria-hidden>·</span>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 text-muted-foreground"
                onClick={() => setGoalsDialogOpen(true)}
              >
                Edit goals
              </Button>
            </>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearMessages()}
            disabled={messages.length === 0}
            className="text-muted-foreground"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear chat
          </Button>
          <Button
            size="sm"
            onClick={handleStartRun}
            disabled={!activeProjectId || isRunning}
          >
            {isRunning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {isRunning ? "Running…" : "Start autonomous run"}
          </Button>
        </div>
      </header>

      <ScrollArea className="flex-1 scrollbar-thin">
        <div className="flex flex-col gap-4 p-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/20 px-6 py-16 text-center text-muted-foreground">
              <p className="text-sm font-medium">Send a message or start an autonomous run.</p>
              <p className="text-xs max-w-sm">
                Assign goals in the sidebar, then click &quot;Start autonomous run&quot; to watch agents work.
              </p>
            </div>
          )}
          {messages.map((m) => (
            <ChatMessageBubble key={m.id} message={m} />
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-border p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex flex-col gap-2"
        >
          {pastedImages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pastedImages.map((dataUrl, i) => (
                <div
                  key={i}
                  className="relative inline-block rounded-lg border border-border overflow-hidden bg-muted/50"
                >
                  <img
                    src={dataUrl}
                    alt=""
                    className="h-16 w-auto max-w-[120px] object-contain"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute right-1 top-1 h-6 w-6 rounded-full opacity-90"
                    onClick={() => removePastedImage(i)}
                    aria-label="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachedFiles.map((f) => (
                <div
                  key={f.id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm",
                    f.error
                      ? "border-destructive/50 bg-destructive/10 text-destructive"
                      : "border-border bg-muted/50"
                  )}
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="truncate max-w-[140px]" title={f.name}>
                    {f.name}
                  </span>
                  {f.extracting && (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                  )}
                  {f.error && (
                    <span className="text-xs opacity-90">{f.error}</span>
                  )}
                  {!f.error && f.blobUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-xs"
                      onClick={() => window.open(f.blobUrl!, "_blank")}
                    >
                      View
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => removeAttachedFile(f.id)}
                    aria-label="Remove file"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              id="chat-file-upload"
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              multiple
              className="sr-only"
              onChange={onFileSelect}
              aria-label="Upload PDF or CSV"
            />
            <label
              htmlFor="chat-file-upload"
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md border border-input bg-background ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">Attach file (PDF or CSV)</span>
            </label>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={handlePaste}
              placeholder="Message the master agent… (+ attach PDF/CSV, paste image)"
              rows={1}
              className="min-h-[44px] max-h-32 resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              className="h-11 w-11 shrink-0"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </div>

      <AssignGoalsDialog
        open={goalsDialogOpen}
        onOpenChange={setGoalsDialogOpen}
        project={activeProject ?? undefined}
      />
    </div>
  );
}
