/**
 * RAG: retrieve relevant documents by similarity for context. Long-term storage on disk + vector embeddings.
 */

import { addDocument, addDocuments, search } from "./store";

const DEFAULT_TABLE = "memory";

export interface RAGDocument {
  text: string;
  meta?: Record<string, unknown>;
}

export interface RAGResult {
  text: string;
  meta: Record<string, unknown>;
  score: number;
}

/**
 * Add one document to RAG store (embedded and persisted on disk).
 */
export async function addRAGDocument(
  text: string,
  meta?: Record<string, unknown>,
  tableName: string = DEFAULT_TABLE
): Promise<void> {
  await addDocument(text, meta ?? {}, tableName);
}

/**
 * Add multiple documents to RAG store.
 */
export async function addRAGDocuments(
  documents: RAGDocument[],
  tableName: string = DEFAULT_TABLE
): Promise<void> {
  await addDocuments(
    documents.map((d) => ({ text: d.text, meta: d.meta })),
    tableName
  );
}

/**
 * RAG retrieve: return top-k documents most similar to the query (by vector similarity).
 */
export async function ragRetrieve(
  query: string,
  options: { limit?: number; tableName?: string } = {}
): Promise<RAGResult[]> {
  const { limit = 10, tableName = DEFAULT_TABLE } = options;
  const results = await search(query, { limit, tableName });
  return results.map((r) => ({
    text: r.text,
    meta: r.meta,
    score: r.score,
  }));
}
