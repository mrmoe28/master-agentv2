/**
 * Desktop autonomy tools: create folders, create files, open URL in browser.
 * No path restrictions: relative paths resolve from workspace (or Desktop when onDesktop);
 * absolute paths are used as-is.
 */

import fs from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";

const execAsync = promisify(exec);

const WORKSPACE_ENV = "DESKTOP_AGENT_WORKSPACE";

function getWorkspaceRoot(): string {
  const env = process.env[WORKSPACE_ENV];
  if (env && path.isAbsolute(env)) return path.resolve(env);
  if (env) return path.resolve(process.cwd(), env);
  return process.cwd();
}

/** User's Desktop directory (platform-specific). */
function getUserDesktopRoot(): string {
  return path.join(os.homedir(), "Desktop");
}

/** Resolve path: absolute as-is, relative from workspace or Desktop when onDesktop. */
function resolvePath(relativeOrAbsolute: string, onDesktop?: boolean): { path: string } {
  const base = onDesktop ? getUserDesktopRoot() : getWorkspaceRoot();
  const resolved = path.isAbsolute(relativeOrAbsolute)
    ? path.resolve(relativeOrAbsolute)
    : path.resolve(base, relativeOrAbsolute);
  return { path: path.resolve(resolved) };
}

export interface CreateFolderResult {
  success: boolean;
  path?: string;
  error?: string;
}

export function createFolder(folderPath: string, options?: { onDesktop?: boolean }): CreateFolderResult {
  const { path: resolved } = resolvePath(folderPath, options?.onDesktop);

  try {
    fs.mkdirSync(resolved, { recursive: true });
    return { success: true, path: resolved };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { success: false, error: message };
  }
}

export interface CreateFileResult {
  success: boolean;
  path?: string;
  error?: string;
}

export function createFile(filePath: string, content: string, options?: { onDesktop?: boolean }): CreateFileResult {
  const { path: resolved } = resolvePath(filePath, options?.onDesktop);

  try {
    const dir = path.dirname(resolved);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(resolved, content, "utf8");
    return { success: true, path: resolved };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { success: false, error: message };
  }
}

export interface OpenUrlResult {
  success: boolean;
  error?: string;
}

const URL_ALLOWED_PREFIXES = ["http://", "https://"];

function isAllowedUrl(url: string): boolean {
  const trimmed = url.trim();
  return URL_ALLOWED_PREFIXES.some((p) => trimmed.toLowerCase().startsWith(p));
}

export function openUrl(url: string): OpenUrlResult {
  const trimmed = url.trim();
  if (!isAllowedUrl(trimmed)) {
    return { success: false, error: "Only http and https URLs are allowed." };
  }

  const platform = os.platform();
  let cmd: string;

  if (platform === "win32") {
    cmd = `start "" "${trimmed.replace(/"/g, '""')}"`;
  } else if (platform === "darwin") {
    cmd = `open "${trimmed.replace(/"/g, '\\"')}"`;
  } else {
    cmd = `xdg-open "${trimmed.replace(/"/g, '\\"')}"`;
  }

  try {
    execAsync(cmd, {
      shell: platform === "win32" ? "cmd.exe" : undefined,
      windowsHide: true,
    });
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { success: false, error: message };
  }
}

/** Workspace root used for desktop tools (for UI or logs). */
export function getDesktopWorkspaceRoot(): string {
  return getWorkspaceRoot();
}
