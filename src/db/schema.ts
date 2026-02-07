/**
 * Drizzle SQLite schema. All tables and fields align with src/types/index.ts.
 */

import {
  sqliteTable,
  text,
  integer,
} from "drizzle-orm/sqlite-core";

/** Projects (goals stored as JSON array). */
export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  goals: text("goals", { mode: "json" }).$type<string[]>().notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Agents. */
export const agents = sqliteTable("agents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  status: text("status", {
    enum: ["idle", "thinking", "running", "waiting", "done", "error"],
  }).notNull(),
  parentId: text("parent_id"),
  projectId: text("project_id").notNull(),
  createdAt: text("created_at").notNull(),
});

/** Tasks. */
export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  status: text("status", {
    enum: ["pending", "in_progress", "completed", "failed"],
  }).notNull(),
  agentId: text("agent_id").notNull(),
  projectId: text("project_id").notNull(),
  result: text("result"),
  createdAt: text("created_at").notNull(),
  completedAt: text("completed_at"),
});

/** File attachment shape for chat (JSON). */
export interface FileAttachmentRow {
  name: string;
  mimeType: string;
  extractedText?: string;
}

/** Tool call shape for chat (JSON). */
export interface ToolCallRow {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: string;
  status: "pending" | "running" | "done" | "error";
}

/** Chat messages (imageUrls, fileAttachments, thoughts, toolCalls as JSON). */
export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  content: text("content").notNull(),
  imageUrls: text("image_urls", { mode: "json" }).$type<string[]>(),
  fileAttachments: text("file_attachments", { mode: "json" }).$type<FileAttachmentRow[]>(),
  timestamp: text("timestamp").notNull(),
  agentId: text("agent_id"),
  thoughts: text("thoughts", { mode: "json" }).$type<string[]>(),
  toolCalls: text("tool_calls", { mode: "json" }).$type<ToolCallRow[]>(),
  isStreaming: integer("is_streaming", { mode: "boolean" }),
});

/** Chat history (sidebar / history view). */
export const historyItems = sqliteTable("history_items", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  sessionId: text("session_id").notNull(),
  query: text("query").notNull(),
  summary: text("summary").notNull(),
  timestamp: text("timestamp").notNull(),
});

/** Log entries. */
export const logEntries = sqliteTable("log_entries", {
  id: text("id").primaryKey(),
  level: text("level", { enum: ["info", "warn", "error", "debug"] }).notNull(),
  message: text("message").notNull(),
  timestamp: text("timestamp").notNull(),
  agentId: text("agent_id"),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
});

/** Memory items (UI store / memory page). */
export const memoryItems = sqliteTable("memory_items", {
  id: text("id").primaryKey(),
  content: text("content").notNull(),
  type: text("type", { enum: ["fact", "preference", "context"] }).notNull(),
  score: integer("score"),
  timestamp: text("timestamp").notNull(),
  source: text("source"),
});

/** Stored skills: named procedures the agent can follow (create_skill / list_skills; retrieved via RAG). */
export const skills = sqliteTable("skills", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  steps: text("steps").notNull(),
  createdAt: text("created_at").notNull(),
});
