/**
 * File-based API keys store with optional encryption.
 * Keys set in the UI are stored here; process.env takes precedence when reading.
 * Uses TOKEN_ENCRYPTION_KEY when set (32+ chars) for encryption.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getAppDataDir } from "./app-data-dir";

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY;

function getFilePath(): string {
  const dir = getAppDataDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return ENCRYPTION_KEY && ENCRYPTION_KEY.length >= 32
    ? path.join(dir, "api-keys.enc")
    : path.join(dir, "api-keys.json");
}

function encrypt(plain: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) return plain;
  try {
    const key = createHash("sha256").update(ENCRYPTION_KEY).digest();
    const iv = randomBytes(16);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, enc]).toString("base64");
  } catch {
    return plain;
  }
}

function decrypt(ciphertext: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) return ciphertext;
  try {
    const key = createHash("sha256").update(ENCRYPTION_KEY).digest();
    const buf = Buffer.from(ciphertext, "base64");
    const iv = buf.subarray(0, 16);
    const authTag = buf.subarray(16, 32);
    const enc = buf.subarray(32);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(enc, undefined, "utf8") + decipher.final("utf8");
  } catch {
    return ciphertext;
  }
}

let cache: Record<string, string> | null = null;

function readRaw(): string | null {
  const filePath = getFilePath();
  if (!fs.existsSync(filePath)) {
    // One-time migration: copy from legacy project/data if present (e.g. after setting APP_DATA_DIR)
    const legacyDir = path.join(process.cwd(), "data");
    const legacyName = filePath.endsWith(".enc") ? "api-keys.enc" : "api-keys.json";
    const legacyPath = path.join(legacyDir, legacyName);
    if (legacyPath !== filePath && fs.existsSync(legacyPath)) {
      try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const raw = fs.readFileSync(legacyPath, "utf8");
        fs.writeFileSync(filePath, raw, "utf8");
        return raw;
      } catch {
        /* ignore */
      }
    }
    return null;
  }
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function parse(raw: string | null): Record<string, string> {
  if (!raw || !raw.trim()) return {};
  const isEncrypted = getFilePath().endsWith(".enc");
  const json = isEncrypted ? decrypt(raw) : raw;
  try {
    const out = JSON.parse(json) as Record<string, unknown>;
    return typeof out === "object" && out !== null
      ? Object.fromEntries(
          Object.entries(out).filter(
            (e): e is [string, string] => typeof e[1] === "string"
          )
        )
      : {};
  } catch {
    return {};
  }
}

function load(): Record<string, string> {
  if (cache !== null) return cache;
  const raw = readRaw();
  cache = parse(raw);
  return cache;
}

/** Get a single key value from the store (not from process.env). */
export function getStored(key: string): string | undefined {
  return load()[key];
}

/** Get value: process.env first, then stored keys. Use this everywhere instead of process.env for API keys. */
export function getEnv(key: string): string {
  const fromEnv = process.env[key];
  if (fromEnv !== undefined && fromEnv !== "") return fromEnv;
  return getStored(key) ?? "";
}

/** Set multiple keys in the store. Persists to disk. */
export function setKeys(keys: Record<string, string>): void {
  const current = load();
  const next = { ...current };
  for (const [k, v] of Object.entries(keys)) {
    if (v === "" || v == null) delete next[k];
    else next[k] = v;
  }
  const filePath = getFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const json = JSON.stringify(next, null, 0);
  const toWrite = filePath.endsWith(".enc") ? encrypt(json) : json;
  fs.writeFileSync(filePath, toWrite, "utf8");
  cache = next;
}

/** List which of the given key names are set in the store (values not returned). */
export function getStoredKeysStatus(keys: string[]): Record<string, boolean> {
  const data = load();
  return Object.fromEntries(keys.map((k) => [k, !!(data[k] && data[k].trim())]));
}

/** Clear in-memory cache (e.g. after external .env change). */
export function clearCache(): void {
  cache = null;
}
