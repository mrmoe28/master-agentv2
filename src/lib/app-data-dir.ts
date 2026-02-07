/**
 * Central app data directory for persistent storage (OAuth tokens, API keys,
 * LanceDB, etc.). Use an absolute path so data persists across app restarts
 * regardless of process.cwd() and so you can use a specific drive (e.g. D:\).
 *
 * Set APP_DATA_DIR to an absolute path (e.g. D:\MasterAgentData or
 * %APPDATA%\MasterAgentOS) for long-term memory and integration persistence.
 * On Windows, %APPDATA% and %LOCALAPPDATA% in APP_DATA_DIR are expanded.
 */

import { join } from "node:path";

/** Default dir when APP_DATA_DIR is not set: project/data (backward compatible). */
function getDefaultDir(): string {
  return join(process.cwd(), "data");
}

/** Expand Windows-style %VAR% in path using process.env. */
function expandEnvPath(pathStr: string): string {
  if (process.platform !== "win32") return pathStr;
  return pathStr.replace(/%([^%]+)%/g, (_, name: string) => {
    const value = process.env[name];
    return value != null ? value : `%${name}%`;
  });
}

/**
 * Resolve the app data directory. Created once per process; mkdir is left to callers.
 */
export function getAppDataDir(): string {
  const env = process.env.APP_DATA_DIR;
  if (env != null && typeof env === "string") {
    const trimmed = env.trim();
    if (trimmed.length > 0) return expandEnvPath(trimmed);
  }
  return getDefaultDir();
}
