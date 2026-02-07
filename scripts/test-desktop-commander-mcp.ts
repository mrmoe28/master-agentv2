/**
 * Verify Desktop Commander MCP integration: config present and server can start.
 * Usage: npm run mcp:test
 * Cursor uses .cursor/mcp.json to run the server when needed; this checks config and that npx can start it.
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { platform } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MCP_JSON_PATH = join(ROOT, ".cursor", "mcp.json");
const STARTUP_WAIT_MS = 6000;
const TIMEOUT_MS = 20000;

function checkConfig(): { ok: boolean; msg: string } {
  if (!existsSync(MCP_JSON_PATH)) {
    return { ok: false, msg: ".cursor/mcp.json not found. Create it with desktop-commander in mcpServers." };
  }
  let config: { mcpServers?: Record<string, unknown> };
  try {
    config = JSON.parse(readFileSync(MCP_JSON_PATH, "utf-8")) as typeof config;
  } catch (e) {
    return { ok: false, msg: "Invalid .cursor/mcp.json: " + (e instanceof Error ? e.message : String(e)) };
  }
  const dc = config.mcpServers?.["desktop-commander"];
  if (!dc || typeof dc !== "object") {
    return { ok: false, msg: "mcpServers.desktop-commander not found in .cursor/mcp.json." };
  }
  const cmd = (dc as { command?: string }).command;
  const args = (dc as { args?: string[] }).args;
  if (cmd !== "npx" || !Array.isArray(args) || !args.some((a) => a.includes("desktop-commander"))) {
    return { ok: false, msg: "desktop-commander entry should use command 'npx' and args including the package." };
  }
  return { ok: true, msg: "Config OK." };
}

function spawnCommand(): ReturnType<typeof spawn> {
  const isWin = platform() === "win32";
  return spawn(
    isWin ? "cmd" : "npx",
    isWin ? ["/c", "npx", "-y", "@wonderwhy-er/desktop-commander@latest"] : ["-y", "@wonderwhy-er/desktop-commander@latest"],
    { stdio: ["pipe", "pipe", "pipe"], windowsHide: true }
  );
}

async function main(): Promise<void> {
  console.log("1. Checking .cursor/mcp.json...");
  const configResult = checkConfig();
  if (!configResult.ok) {
    console.error("FAILED:", configResult.msg);
    process.exit(1);
  }
  console.log("   ", configResult.msg);

  console.log("2. Starting Desktop Commander MCP (npx, first run may download)...");
  const child = spawnCommand();
  let stderr = "";
  child.stderr?.on("data", (d: Buffer) => {
    stderr += d.toString();
  });

  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      try {
        child.kill("SIGKILL");
      } catch {
        /* ignore */
      }
      console.log("   Server started and ran for", STARTUP_WAIT_MS / 1000, "s (OK).");
      console.log("Desktop Commander MCP integration is configured and runnable.");
      console.log("Reload Cursor or restart the MCP server in Cursor settings to use it.");
      resolve();
      process.exit(0);
    }, STARTUP_WAIT_MS);

    child.on("error", (err) => {
      clearTimeout(timeout);
      console.error("FAILED: Spawn error:", err?.message ?? String(err));
      process.exit(1);
    });

    child.on("exit", (code, signal) => {
      clearTimeout(timeout);
      if (code === 0 && stderr.length < 500) {
        console.log("   Process exited 0 (OK).");
        console.log("Desktop Commander MCP integration is configured and runnable.");
        resolve();
        process.exit(0);
      }
      console.error("FAILED: Process exited with code=" + code + " signal=" + signal);
      if (stderr) console.error("stderr:", stderr.slice(-800));
      process.exit(1);
    });
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
