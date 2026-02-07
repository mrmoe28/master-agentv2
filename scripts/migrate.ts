/**
 * Run Drizzle migrations against the SQLite database.
 * Uses APP_DATA_DIR/sqlite.db (or data/sqlite.db if APP_DATA_DIR is unset).
 *
 * Run after db:generate: npm run db:generate && npm run db:migrate
 */

import { join, dirname } from "node:path";
import { mkdirSync, existsSync } from "node:fs";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { getAppDataDir } from "../src/lib/app-data-dir";

// SQLite file path: use DATABASE_URL only if it looks like a local path (e.g. .db file)
const envUrl = process.env.DATABASE_URL;
const dbPath =
  envUrl && !envUrl.includes("://") && (envUrl.endsWith(".db") || envUrl.includes("/") || envUrl.includes("\\"))
    ? envUrl
    : join(getAppDataDir(), "sqlite.db");
const migrationsFolder = join(process.cwd(), "drizzle");

const dbDir = dirname(dbPath);
if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });

const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

migrate(db, { migrationsFolder, migrationsTable: "__drizzle_migrations" });

sqlite.close();
console.log("Migrations completed.");
process.exit(0);
