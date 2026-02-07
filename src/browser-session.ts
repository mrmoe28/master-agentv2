/**
 * Browser session for chat tools: one browser per request, shared across
 * browser_navigate, browser_click, browser_fill, browser_extract, browser_snapshot.
 *
 * Simple mode (default): When CHROME_CDP_URL is not set, the app launches a visible
 * Chrome window when the agent first uses a browser tool. You see the window
 * open, navigate, and click—no manual steps. The agent has full control and
 * can see the page (snapshot/extract).
 *
 * Optional CDP mode: Set CHROME_CDP_URL=http://localhost:9222 to attach to
 * your existing Chrome (e.g. run npm run chrome:debug first).
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { AsyncLocalStorage } from "async_hooks";
import { chromium, type Browser, type Page } from "playwright";

const BROWSER_TIMEOUT_MS = 30000;
const CDP_PORT = 9222;
const CDP_CHECK_URL = `http://127.0.0.1:${CDP_PORT}/json/version`;

const CDP_URL = process.env.CHROME_CDP_URL?.trim() || "";

/** When false, never start Chrome—only connect to Chrome already running with debug (use your existing tab). */
const CDP_AUTO_START_RAW = (process.env.CHROME_CDP_AUTO_START ?? "").trim().toLowerCase();
const CDP_AUTO_START = CDP_AUTO_START_RAW !== "false" && CDP_AUTO_START_RAW !== "0" && CDP_AUTO_START_RAW !== "off";

/** True if CDP_URL points at localhost so we can auto-start Chrome. */
const isLocalCDP =
  CDP_URL !== "" &&
  (CDP_URL.includes("localhost") || CDP_URL.includes("127.0.0.1"));

/** Check if Chrome with remote debugging is already reachable. */
async function isCDPReachable(): Promise<boolean> {
  try {
    const res = await fetch(CDP_CHECK_URL, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

/** Find Chrome executable (Windows). Matches scripts/start-chrome-debug.ps1. */
function findChromePath(): string | null {
  const env = process.env;
  const candidates = [
    path.join(env.ProgramFiles ?? "C:\\Program Files", "Google", "Chrome", "Application", "chrome.exe"),
    path.join(env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)", "Google", "Chrome", "Application", "chrome.exe"),
    path.join(env.LOCALAPPDATA ?? "", "Google", "Chrome", "Application", "chrome.exe"),
  ].filter((p) => p && fs.existsSync(p));
  return candidates[0] ?? null;
}

/** Start Chrome with remote debugging in the background (detached). Returns true if started. */
function startChromeWithDebug(): boolean {
  const chromePath = process.env.CHROME_PATH?.trim() || findChromePath();
  if (!chromePath) return false;
  const child = spawn(
    chromePath,
    [
      "--remote-debugging-port=" + CDP_PORT,
      "--profile-directory=Default",
    ],
    {
      detached: true,
      stdio: "ignore",
    }
  );
  child.unref();
  return true;
}

/** If CHROME_CDP_URL is set to localhost, ensure Chrome is running with debug (start it if not). When CHROME_CDP_AUTO_START=false, only connect—never start Chrome (use your existing window). */
async function ensureChromeDebugRunning(): Promise<void> {
  if (!isLocalCDP) return;
  if (await isCDPReachable()) return;
  if (!CDP_AUTO_START) {
    throw new Error(
      "Chrome with remote debugging is not running. To use the page you already have open: start Chrome with remote debugging first (npm run chrome:debug), then open your page in that window and try again."
    );
  }
  if (!startChromeWithDebug()) {
    throw new Error(
      "Chrome not found. Install Google Chrome or set CHROME_PATH in .env to the chrome.exe path."
    );
  }
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 500));
    if (await isCDPReachable()) return;
  }
  throw new Error(
    "Chrome with remote debugging did not start in time. Start it manually: npm run chrome:debug"
  );
}

/** Launch options: default is visible Chrome so the user can see the agent. */
function getLaunchOptions(): { channel?: string; headless: boolean; args: string[] } {
  const headedEnv = (process.env.BROWSER_HEADED ?? "").trim().toLowerCase();
  const headless = headedEnv === "false" || headedEnv === "0" ? true : false;
  const channelEnv = (process.env.BROWSER_CHANNEL ?? "chrome").trim().toLowerCase();
  const channel =
    channelEnv === "chrome" || channelEnv === "chrome-beta" || channelEnv === "msedge"
      ? channelEnv
      : "chrome";
  const args = ["--no-sandbox", "--disable-setuid-sandbox"];
  return { channel, headless, args };
}

export interface BrowserSessionStore {
  browser: Browser | null;
  page: Page | null;
  /** True when connected via CDP (do not close browser on session end). */
  isCdpConnection?: boolean;
}

export const browserSessionStorage = new AsyncLocalStorage<BrowserSessionStore>();

export function getBrowserSession(): BrowserSessionStore | undefined {
  return browserSessionStorage.getStore();
}

/** Normalize URL for comparison (origin + pathname, no hash or trailing slash). */
function urlKey(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`.replace(/\/$/, "") || "/";
  } catch {
    return url;
  }
}

/**
 * Get or create the Playwright page for the current request.
 * When CHROME_CDP_URL is set, connects to the user's existing Chrome and
 * uses the tab matching preferUrl if present, otherwise the first tab.
 */
export async function getPage(preferUrl?: string): Promise<Page> {
  const store = getBrowserSession();
  if (!store) {
    throw new Error("Browser session not active. Use runWithBrowserSession().");
  }
  if (store.page && !store.page.isClosed()) {
    if (!preferUrl) {
      if (store.isCdpConnection) await store.page.bringToFront();
      return store.page;
    }
    const current = urlKey(store.page.url());
    const want = urlKey(preferUrl);
    if (current === want || store.page.url().startsWith(preferUrl)) {
      if (store.isCdpConnection) await store.page.bringToFront();
      return store.page;
    }
  }

  if (CDP_URL) {
    await ensureChromeDebugRunning();
    store.browser = await chromium.connectOverCDP(CDP_URL, { timeout: 10000 });
    store.isCdpConnection = true;
    const context = store.browser.contexts()[0];
    if (!context) throw new Error("CDP browser has no default context.");
    const pages = context.pages();
    if (preferUrl && pages.length > 0) {
      const want = urlKey(preferUrl);
      const match = pages.find((p) => {
        const k = urlKey(p.url());
        return k === want || k.startsWith(want) || p.url().includes(preferUrl);
      });
      if (match && !match.isClosed()) {
        store.page = match;
        store.page.setDefaultTimeout(BROWSER_TIMEOUT_MS);
        await store.page.bringToFront();
        return store.page;
      }
    }
    const page = pages[0] ?? (await context.newPage());
    store.page = page;
    store.page.setDefaultTimeout(BROWSER_TIMEOUT_MS);
    await store.page.bringToFront();
    return store.page;
  }

  const launchOpts = getLaunchOptions();
  try {
    store.browser = await chromium.launch({
      headless: launchOpts.headless,
      args: launchOpts.args,
      ...(launchOpts.channel && { channel: launchOpts.channel }),
    });
  } catch (e) {
    if (launchOpts.channel) {
      store.browser = await chromium.launch({
        headless: launchOpts.headless,
        args: launchOpts.args,
      });
    } else {
      throw e;
    }
  }
  const context = await store.browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  store.page = await context.newPage();
  store.page.setDefaultTimeout(BROWSER_TIMEOUT_MS);
  return store.page;
}

/**
 * Close the browser for the current request. Idempotent.
 * When connected via CDP, we only clear our reference; we do not close the user's browser.
 */
export async function closeBrowserSession(): Promise<void> {
  const store = getBrowserSession();
  if (!store) return;
  if (store.page && !store.page.isClosed() && !store.isCdpConnection) {
    try {
      await store.page.close();
    } catch {
      // ignore
    }
  }
  store.page = null;
  if (store.browser && !store.isCdpConnection) {
    try {
      await store.browser.close();
    } catch {
      // ignore
    }
  }
  store.browser = null;
}

/** When we launched a visible browser (not CDP), keep it open briefly so the user can see the result. */
const HEADED_CLOSE_DELAY_MS = 2500;

/**
 * Run a callback with a browser session. The session is closed after the callback completes.
 * When using a launched (visible) browser, we wait a few seconds before closing so you can see the result.
 */
export async function runWithBrowserSession<T>(
  fn: () => Promise<T>
): Promise<T> {
  const store: BrowserSessionStore = { browser: null, page: null };
  try {
    return await browserSessionStorage.run(store, fn);
  } finally {
    if (store.browser && !store.isCdpConnection) {
      try {
        await new Promise((r) => setTimeout(r, HEADED_CLOSE_DELAY_MS));
      } catch {
        // ignore
      }
      try {
        await store.browser.close();
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Test helper: launch browser (headed), navigate to URL, return title. Used by scripts/test-browser.ts
 */
export async function testBrowserSession(
  url: string
): Promise<{ ok: boolean; title?: string; error?: string }> {
  return runWithBrowserSession(async () => {
    const page = await getPage();
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: BROWSER_TIMEOUT_MS,
    });
    const title = await page.title();
    return { ok: true, title };
  });
}
