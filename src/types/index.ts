export interface Project {
  id: string;
  name: string;
  description: string;
  goals: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: "idle" | "thinking" | "running" | "waiting" | "done" | "error";
  parentId: string | null;
  projectId: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  agentId: string;
  projectId: string;
  result?: string;
  createdAt: string;
  completedAt?: string;
}

export type MessageRole = "user" | "assistant" | "system";

/** File attached to a user message (PDF/CSV) with extracted text for the agent. */
export interface FileAttachment {
  name: string;
  mimeType: string;
  /** Extracted or raw text for the agent to summarize/use. */
  extractedText?: string;
  /** Blob URL for viewing PDF in-browser (e.g. open in new tab). Not persisted. */
  blobUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  /** Data URLs (e.g. from pasted screenshots) for vision. User messages only. */
  imageUrls?: string[];
  /** Attached PDF/CSV files with extracted text. User messages only. */
  fileAttachments?: FileAttachment[];
  timestamp: string;
  agentId?: string;
  thoughts?: string[];
  toolCalls?: ToolCall[];
  isStreaming?: boolean;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: string;
  status: "pending" | "running" | "done" | "error";
}

export interface LogEntry {
  id: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  timestamp: string;
  agentId?: string;
  metadata?: Record<string, unknown>;
}

export interface MemoryItem {
  id: string;
  content: string;
  type: "fact" | "preference" | "context";
  score?: number;
  timestamp: string;
  source?: string;
}

export interface HistoryItem {
  id: string;
  projectId: string;
  sessionId: string;
  query: string;
  summary: string;
  timestamp: string;
}
