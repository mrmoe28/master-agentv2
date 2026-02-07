/**
 * SQLite DB client for API routes. Uses same path as migrations (APP_DATA_DIR/sqlite.db or data/sqlite.db).
 * Singleton in development to avoid multiple connections on hot reload.
 */

import { join, dirname } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { getAppDataDir } from "@/lib/app-data-dir";
import * as schema from "./schema";

const envUrl = process.env.DATABASE_URL;
const dbPath =
  envUrl &&
  typeof envUrl === "string" &&
  !envUrl.includes("://") &&
  (envUrl.endsWith(".db") || envUrl.includes("/") || envUrl.includes("\\"))
    ? envUrl
    : join(getAppDataDir(), "sqlite.db");

function createConnection(): ReturnType<typeof drizzle<typeof schema>> {
  const dir = dirname(dbPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const sqlite = new Database(dbPath);
  return drizzle(sqlite, { schema });
}

declare global {
  var __db: ReturnType<typeof createConnection> | undefined;
}

let _db: ReturnType<typeof createConnection> | null = null;

export function getDb(): ReturnType<typeof createConnection> {
  if (process.env.NODE_ENV !== "production") {
    if (!global.__db) global.__db = createConnection();
    return global.__db;
  }
  if (!_db) _db = createConnection();
  return _db;
}
