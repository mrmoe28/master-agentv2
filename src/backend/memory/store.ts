/**
 * Long-term vector store on disk via LanceDB. Persists to a directory path.
 *
 * Metadata is stored as a JSON string (not a struct) to avoid Apache Arrow
 * "two different dictionaries with the same Id" when merging batches.
 * If you had RAG data before this change, delete the LanceDB directory
 * (e.g. data/lancedb or APP_DATA_DIR/lancedb) so the table is recreated with string meta.
 */

import { join } from "node:path";
import * as lancedb from "@lancedb/lancedb";
import { createEmbeddingFunction } from "./embeddings";
import { MemoryError, getErrorMessage } from "@/utils/errors";
import { getAppDataDir } from "@/lib/app-data-dir";

const DEFAULT_TABLE_NAME = "memory";
const TEXT_COLUMN = "text";

/** Serialize meta to a string so Arrow uses Utf8 instead of Struct (avoids "two different dictionaries with the same Id"). */
function metaToStorage(meta: Record<string, unknown>): string {
  return JSON.stringify(meta);
}

/** Parse meta from storage; may be string (new) or object (old schema). */
function metaFromStorage(value: unknown): Record<string, unknown> {
  if (value == null) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof value === "object" && value !== null) return value as Record<string, unknown>;
  return {};
}

let db: lancedb.Connection | null = null;

function getDbPath(): string {
  if (process.env.LANCEDB_PATH?.trim()) return process.env.LANCEDB_PATH.trim();
  return join(getAppDataDir(), "lancedb");
}

/**
 * Get or create the LanceDB connection (disk path).
 * @throws MemoryError if connection fails
 */
export async function getConnection(path?: string): Promise<lancedb.Connection> {
  if (!db) {
    try {
      db = await lancedb.connect(path ?? getDbPath());
    } catch (err) {
      throw new MemoryError(
        `Failed to connect to LanceDB at ${path ?? getDbPath()}: ${getErrorMessage(err)}`,
        "getConnection",
        err instanceof Error ? err : undefined
      );
    }
  }
  return db;
}

/**
 * Create or open a table with vector embeddings. Uses local Transformers.js model.
 * @throws MemoryError if table creation/opening fails
 */
export async function getOrCreateTable(tableName: string = DEFAULT_TABLE_NAME) {
  try {
    const connection = await getConnection();
    const embedFn = createEmbeddingFunction(TEXT_COLUMN);

    const tableNames = await connection.tableNames();
    if (tableNames.includes(tableName)) {
      return connection.openTable(tableName);
    }

    const [initVector] = await embedFn.embed(["init"]);
    const table = await connection.createTable(
      tableName,
      [{ id: "init", text: "init", vector: initVector, meta: metaToStorage({}) }],
      { mode: "overwrite" }
    );
    await table.delete('id = "init"');
    return table;
  } catch (err) {
    // Re-throw if already a MemoryError
    if (err instanceof MemoryError) throw err;

    throw new MemoryError(
      `Failed to get or create table "${tableName}": ${getErrorMessage(err)}`,
      "getOrCreateTable",
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Add a single document (text + optional metadata). Embeds and stores on disk.
 * @throws MemoryError if document insertion fails
 */
export async function addDocument(
  text: string,
  meta: Record<string, unknown> = {},
  tableName: string = DEFAULT_TABLE_NAME
): Promise<void> {
  // Validate input
  if (!text || text.trim().length === 0) {
    console.warn("[MemoryStore] Skipping empty document");
    return;
  }

  try {
    const connection = await getConnection();
    const embedFn = createEmbeddingFunction(TEXT_COLUMN);
    const [vector] = await embedFn.embed([text]);

    const tableNames = await connection.tableNames();
    const id = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const metaStr = metaToStorage(meta);
    if (tableNames.includes(tableName)) {
      const table = await connection.openTable(tableName);
      await table.add([{ id, text, vector, meta: metaStr }]);
    } else {
      await connection.createTable(tableName, [{ id, text, vector, meta: metaStr }]);
    }
  } catch (err) {
    if (err instanceof MemoryError) throw err;

    throw new MemoryError(
      `Failed to add document to table "${tableName}": ${getErrorMessage(err)}`,
      "addDocument",
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Add multiple documents. Embeds in batch and stores.
 * @throws MemoryError if document insertion fails
 */
export async function addDocuments(
  items: { text: string; meta?: Record<string, unknown> }[],
  tableName: string = DEFAULT_TABLE_NAME
): Promise<void> {
  // Filter out empty items
  const validItems = items.filter((i) => i.text && i.text.trim().length > 0);
  if (validItems.length === 0) {
    console.warn("[MemoryStore] No valid documents to add");
    return;
  }

  try {
    const connection = await getConnection();
    const embedFn = createEmbeddingFunction(TEXT_COLUMN);
    const texts = validItems.map((i) => i.text);
    const vectors = await embedFn.embed(texts);

    const rows = validItems.map((item, i) => ({
      id: `doc_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 9)}`,
      text: item.text,
      vector: vectors[i],
      meta: metaToStorage(item.meta ?? {}),
    }));

    const tableNames = await connection.tableNames();
    if (tableNames.includes(tableName)) {
      const table = await connection.openTable(tableName);
      await table.add(rows);
    } else {
      await connection.createTable(tableName, rows);
    }
  } catch (err) {
    if (err instanceof MemoryError) throw err;

    throw new MemoryError(
      `Failed to add ${validItems.length} documents to table "${tableName}": ${getErrorMessage(err)}`,
      "addDocuments",
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Vector similarity search. Returns top-k rows (text + meta + score).
 * Returns empty array on failure instead of throwing.
 */
export async function search(
  queryText: string,
  options: { limit?: number; tableName?: string } = {}
): Promise<{ text: string; meta: Record<string, unknown>; score: number }[]> {
  const { limit = 10, tableName = DEFAULT_TABLE_NAME } = options;

  // Validate input
  if (!queryText || queryText.trim().length === 0) {
    console.warn("[MemoryStore] Empty search query, returning empty results");
    return [];
  }

  try {
    const connection = await getConnection();
    const embedFn = createEmbeddingFunction(TEXT_COLUMN);
    const [queryVector] = await embedFn.embed([queryText]);

    const tableNames = await connection.tableNames();
    if (!tableNames.includes(tableName)) {
      return [];
    }

    const table = await connection.openTable(tableName);
    const results = await table
      .vectorSearch(queryVector)
      .limit(limit)
      .toArray();

    return (results as { text: string; meta: unknown; _distance?: number }[]).map((r) => ({
      text: r.text,
      meta: metaFromStorage(r.meta),
      score: r._distance != null ? 1 - r._distance : 1,
    }));
  } catch (err) {
    // Log error but return empty results instead of throwing
    // This allows the agent to continue even if memory search fails
    console.error(`[MemoryStore] Search failed: ${getErrorMessage(err)}`);
    return [];
  }
}
