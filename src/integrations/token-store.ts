/**
 * Token storage with optional encryption.
 * Production: use a persistent ITokenStore (e.g. DB) and set TOKEN_ENCRYPTION_KEY.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { getAppDataDir } from '@/lib/app-data-dir';
import type { ITokenStore, ProviderId, StoredTokens } from './types';

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY;

function encrypt(plain: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) return plain;
  try {
    const key = createHash('sha256').update(ENCRYPTION_KEY).digest();
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, enc]).toString('base64');
  } catch (err) {
    console.warn('[TokenStore] Encryption failed, storing unencrypted:', err instanceof Error ? err.message : String(err));
    return plain;
  }
}

function decrypt(ciphertext: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) return ciphertext;
  try {
    const key = createHash('sha256').update(ENCRYPTION_KEY).digest();
    const buf = Buffer.from(ciphertext, 'base64');
    const iv = buf.subarray(0, 16);
    const authTag = buf.subarray(16, 32);
    const enc = buf.subarray(32);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(enc, undefined, 'utf8') + decipher.final('utf8');
  } catch (err) {
    console.warn('[TokenStore] Decryption failed, returning as-is:', err instanceof Error ? err.message : String(err));
    return ciphertext;
  }
}

/** In-memory token store. Replace with DB-backed store in production. */
export class MemoryTokenStore implements ITokenStore {
  private readonly store = new Map<string, string>();

  private key(provider: ProviderId, userId: string): string {
    return `${provider}:${userId}`;
  }

  async get(provider: ProviderId, userId: string): Promise<StoredTokens | null> {
    const raw = this.store.get(this.key(provider, userId));
    if (!raw) return null;
    try {
      const json = decrypt(raw);
      return JSON.parse(json) as StoredTokens;
    } catch (err) {
      console.warn(`[TokenStore] Failed to parse tokens for ${provider}:${userId}:`, err instanceof Error ? err.message : String(err));
      return null;
    }
  }

  async set(provider: ProviderId, userId: string, tokens: StoredTokens): Promise<void> {
    try {
      const json = JSON.stringify(tokens);
      this.store.set(this.key(provider, userId), encrypt(json));
    } catch (err) {
      console.error(`[TokenStore] Failed to store tokens for ${provider}:${userId}:`, err instanceof Error ? err.message : String(err));
      throw err; // Re-throw as this is a critical operation
    }
  }

  async delete(provider: ProviderId, userId: string): Promise<void> {
    this.store.delete(this.key(provider, userId));
  }
}

/** Resolve token file path at runtime so it works after app restart (cwd can differ at module load). */
function getDefaultTokensPath(): string {
  const envPath = process.env.OAUTH_TOKENS_FILE;
  if (envPath && envPath.trim()) return envPath.trim();
  return join(getAppDataDir(), 'oauth-tokens.json');
}

/** Key is "provider:userId", value is encrypted JSON string. */
type FileStoreData = Record<string, string>;

/** File-backed token store so tokens survive server restarts. */
export class FileTokenStore implements ITokenStore {
  private readonly getFilePath: () => string;

  constructor(filePathOrResolver?: string | (() => string)) {
    if (typeof filePathOrResolver === 'function') {
      this.getFilePath = filePathOrResolver;
    } else if (typeof filePathOrResolver === 'string') {
      this.getFilePath = () => filePathOrResolver;
    } else {
      this.getFilePath = getDefaultTokensPath;
    }
  }

  private get filePath(): string {
    return this.getFilePath();
  }

  private key(provider: ProviderId, userId: string): string {
    return `${provider}:${userId}`;
  }

  private async readAll(): Promise<FileStoreData> {
    const primaryPath = this.filePath;
    try {
      const raw = await readFile(primaryPath, 'utf8');
      const data = JSON.parse(raw) as FileStoreData;
      return typeof data === 'object' && data !== null ? data : {};
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') {
        // One-time migration: copy from legacy project/data if present (e.g. after setting APP_DATA_DIR)
        const legacyPath = join(process.cwd(), 'data', 'oauth-tokens.json');
        if (legacyPath !== primaryPath) {
          try {
            const legacyRaw = await readFile(legacyPath, 'utf8');
            const dir = join(primaryPath, '..');
            await mkdir(dir, { recursive: true });
            await writeFile(primaryPath, legacyRaw, 'utf8');
            const data = JSON.parse(legacyRaw) as FileStoreData;
            return typeof data === 'object' && data !== null ? data : {};
          } catch {
            /* ignore */
          }
        }
        return {};
      }
      console.warn('[TokenStore] Failed to read file:', err instanceof Error ? err.message : String(err));
      return {};
    }
  }

  private async writeAll(data: FileStoreData): Promise<void> {
    const dir = join(this.filePath, '..');
    await mkdir(dir, { recursive: true });
    await writeFile(this.filePath, JSON.stringify(data, null, 0), 'utf8');
  }

  async get(provider: ProviderId, userId: string): Promise<StoredTokens | null> {
    const data = await this.readAll();
    const raw = data[this.key(provider, userId)];
    if (!raw) return null;
    try {
      const json = decrypt(raw);
      return JSON.parse(json) as StoredTokens;
    } catch (err) {
      console.warn(`[TokenStore] Failed to parse tokens for ${provider}:${userId}:`, err instanceof Error ? err.message : String(err));
      return null;
    }
  }

  async set(provider: ProviderId, userId: string, tokens: StoredTokens): Promise<void> {
    const data = await this.readAll();
    try {
      const json = JSON.stringify(tokens);
      data[this.key(provider, userId)] = encrypt(json);
      await this.writeAll(data);
    } catch (err) {
      console.error(`[TokenStore] Failed to store tokens for ${provider}:${userId}:`, err instanceof Error ? err.message : String(err));
      throw err;
    }
  }

  async delete(provider: ProviderId, userId: string): Promise<void> {
    const data = await this.readAll();
    delete data[this.key(provider, userId)];
    await this.writeAll(data);
  }
}

/**
 * Default token store: file-backed so Google tokens survive app restarts.
 * Path is resolved at runtime (not at module load) so it works when cwd differs.
 * Set OAUTH_TOKENS_FILE to an absolute path to use a fixed location (e.g. user data dir).
 */
export const defaultTokenStore: ITokenStore = (() => {
  try {
    return new FileTokenStore(getDefaultTokensPath);
  } catch {
    return new MemoryTokenStore();
  }
})();
