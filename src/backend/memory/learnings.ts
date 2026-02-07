/**
 * Learnings: discrete facts/preferences/context the agent extracts from conversations.
 * Stored in SQLite (memory_items) for "list all" and in LanceDB for semantic retrieval.
 */

import { getDb } from "@/db";
import { memoryItems } from "@/db/schema";
import { addRAGDocument } from "./rag";
import { eq } from "drizzle-orm";

const LEARNING_SOURCE = "chat";
const LEARNING_TYPE = "fact" as const;

export interface StoredLearning {
  id: string;
  content: string;
  type: string;
  timestamp: string;
  source: string | null;
}

/**
 * Store one learning in SQLite and in RAG. Idempotent by content: skips if same content exists (optional dedupe).
 */
export async function addLearning(
  content: string,
  options?: { dedupeByContent?: boolean }
): Promise<void> {
  const trimmed = content?.trim();
  if (!trimmed) return;

  const db = getDb();
  const id = `learn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const timestamp = new Date().toISOString();

  if (options?.dedupeByContent) {
    const existing = await db
      .select({ id: memoryItems.id })
      .from(memoryItems)
      .where(eq(memoryItems.content, trimmed))
      .limit(1);
    if (existing.length > 0) return;
  }

  await db.insert(memoryItems).values({
    id,
    content: trimmed,
    type: LEARNING_TYPE,
    score: null,
    timestamp,
    source: LEARNING_SOURCE,
  });

  await addRAGDocument(trimmed, {
    type: "learning",
    timestamp,
    source: LEARNING_SOURCE,
  }).catch((err) =>
    console.warn("[learnings] Failed to add to RAG:", err)
  );
}

/**
 * Return all learnings from chat, oldest first (chronological).
 */
export async function getAllLearnings(): Promise<StoredLearning[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: memoryItems.id,
      content: memoryItems.content,
      type: memoryItems.type,
      timestamp: memoryItems.timestamp,
      source: memoryItems.source,
    })
    .from(memoryItems)
    .where(eq(memoryItems.source, LEARNING_SOURCE))
    .orderBy(memoryItems.timestamp);

  return rows as StoredLearning[];
}
