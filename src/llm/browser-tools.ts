/**
 * Browser automation tools for the chat: navigate, click, fill, extract.
 * Require the chat API to run inside runWithBrowserSession() so one page is shared per request.
 */

import type { ChatToolDef } from "./client";
import {
  getPage,
  getBrowserSession,
} from "@/browser-session";
import type { Page, Locator } from "playwright";

const ACTION_TIMEOUT_MS = 15000;

function getLocator(page: Page, selector: string): Locator {
  const s = String(selector).trim();
  if (s.startsWith("role:")) {
    const parts = s.slice(5).split(":");
    const role = (parts[0] ?? "button").toLowerCase();
    const name = parts.slice(1).join(":").trim();
    return page.getByRole(role as "button" | "link" | "textbox" | "heading", {
      name: name || undefined,
    });
  }
  if (s.startsWith("text:")) {
    return page.getByText(s.slice(5).trim());
  }
  if (s.startsWith("label:") || s.startsWith("placeholder:")) {
    const value = s.includes(":") ? s.slice(s.indexOf(":") + 1).trim() : "";
    if (s.startsWith("label:")) return page.getByLabel(value);
    return page.getByPlaceholder(value);
  }
  return page.locator(s);
}

export const browserToolDefs: ChatToolDef[] = [
  {
    name: "browser_navigate",
    description:
      "Navigate the headless browser to a URL. Use this first when the user asks to open a URL, then use browser_click or browser_fill or browser_extract. Shares the same page with other browser_* tools in this conversation.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Full URL (e.g. https://example.com)",
        },
      },
      required: ["url"],
    },
    execute: async (args) => {
      const url = String(args.url ?? "").trim();
      if (!url) return JSON.stringify({ success: false, error: "url is required" });
      try {
        const page = await getPage(url);
        const current = page.url();
        let samePage = current === url || current.startsWith(url);
        if (!samePage && url.startsWith("http")) {
          try {
            const a = new URL(current);
            const b = new URL(url);
            samePage = a.origin === b.origin && a.pathname === b.pathname;
          } catch {
            // ignore
          }
        }
        if (samePage) {
          return JSON.stringify({
            success: true,
            status: 200,
            url: current,
            message: `Page is already open at ${current}. Do not navigate again—proceed to the next step (e.g. browser_snapshot, browser_click, or browser_extract).`,
          });
        }
        const res = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: ACTION_TIMEOUT_MS,
        });
        const status = res?.status();
        const finalUrl = page.url();
        return JSON.stringify({
          success: true,
          status,
          url: finalUrl,
          message: `Navigated to ${finalUrl}`,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return JSON.stringify({ success: false, error: msg });
      }
    },
  },
  {
    name: "browser_click",
    description:
      "Click an element on the current page. Use after browser_navigate. Selector can be: 'role:button:Login' (role and visible text), 'text:Submit', 'label:Email' (form label), 'placeholder:Search', or a CSS selector like '#submit' or 'button.primary'.",
    parameters: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description:
            "How to find the element: role:button:Login, text:Submit, label:Username, placeholder:Search, or CSS selector",
        },
      },
      required: ["selector"],
    },
    execute: async (args) => {
      const selector = String(args.selector ?? "").trim();
      if (!selector) return JSON.stringify({ success: false, error: "selector is required" });
      try {
        const page = await getPage();
        const locator = getLocator(page, selector);
        await locator.first().click({ timeout: ACTION_TIMEOUT_MS });
        return JSON.stringify({ success: true, message: `Clicked: ${selector}` });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return JSON.stringify({ success: false, error: msg });
      }
    },
  },
  {
    name: "browser_fill",
    description:
      "Fill a form field (input, textarea) on the current page. Use selector like 'label:Email', 'placeholder:Search', 'role:textbox:Name', or CSS '#email'. Clears the field then types the value.",
    parameters: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description:
            "How to find the field: label:Email, placeholder:Search, role:textbox:Name, or CSS selector",
        },
        value: { type: "string", description: "Text to type into the field" },
      },
      required: ["selector", "value"],
    },
    execute: async (args) => {
      const selector = String(args.selector ?? "").trim();
      const value = String(args.value ?? "");
      if (!selector) return JSON.stringify({ success: false, error: "selector is required" });
      try {
        const page = await getPage();
        const locator = getLocator(page, selector);
        await locator.first().fill(value, { timeout: ACTION_TIMEOUT_MS });
        return JSON.stringify({
          success: true,
          message: `Filled ${selector} with ${value.length} character(s)`,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return JSON.stringify({ success: false, error: msg });
      }
    },
  },
  {
    name: "browser_extract",
    description:
      "Extract text from the current page. Use after navigating (and optionally clicking). scope: 'full' for entire page text, 'body' for body only, or a CSS selector (e.g. '.content', 'table'). Waits briefly for content to load and tries iframes if the main page is empty. Returns extracted text for the agent to use.",
    parameters: {
      type: "object",
      properties: {
        scope: {
          type: "string",
          description:
            "What to extract: 'full' (whole page text), 'body' (body only), or a CSS selector for a specific element",
        },
      },
      required: ["scope"],
    },
    execute: async (args) => {
      const scope = String(args.scope ?? "full").trim() || "full";
      try {
        const page = await getPage();
        const WAIT_FOR_CONTENT_MS = 3000;
        const MIN_CONTENT_LENGTH = 20;

        const getTextFromPage = async (p: Page, s: string): Promise<string> => {
          const t = await p.evaluate((sc) => {
            const el = sc === "body" ? document.body : document.documentElement;
            return el?.innerText ?? "";
          }, s);
          return t.replace(/\s+/g, " ").trim();
        };

        let text: string;
        if (scope === "full" || scope === "body") {
          await page
            .waitForFunction(
              (minLen: number) => {
                const el = document.body;
                const t = el?.innerText ?? "";
                return t.replace(/\s+/g, " ").trim().length >= minLen;
              },
              MIN_CONTENT_LENGTH,
              { timeout: WAIT_FOR_CONTENT_MS }
            )
            .catch(() => null);
          text = await getTextFromPage(page, scope);
          if (text.length < MIN_CONTENT_LENGTH) {
            const frames = page.frames().filter((f) => f !== page.mainFrame());
            for (const frame of frames) {
              try {
                const frameText = await frame.evaluate(() => document.body?.innerText ?? "");
                const trimmed = frameText.replace(/\s+/g, " ").trim();
                if (trimmed.length > text.length) {
                  text = trimmed;
                  break;
                }
              } catch {
                // ignore frame errors
              }
            }
          }
        } else {
          const locator = page.locator(scope).first();
          text = await locator.innerText({ timeout: ACTION_TIMEOUT_MS });
          text = text.replace(/\s+/g, " ").trim();
        }
        const trimmed = text.replace(/\s+/g, " ").trim();
        const excerpt = trimmed.slice(0, 15000);
        const hint =
          trimmed.length === 0
            ? " Page may use an iframe or dynamic content; try browser_snapshot to see structure, or extract a specific element with a CSS selector."
            : "";
        return JSON.stringify({
          success: true,
          text: excerpt,
          length: trimmed.length,
          message: `Extracted ${trimmed.length} character(s).${hint}`,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return JSON.stringify({ success: false, error: msg });
      }
    },
  },
  {
    name: "browser_snapshot",
    description:
      "Get a short text snapshot of the page structure (links and buttons with text) to help decide what to click or extract. Use after browser_navigate to see what's on the page.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    execute: async () => {
      try {
        const page = await getPage();
        const snapshot = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll("button, [role='button'], input[type='submit']"))
            .map((el) => (el as HTMLElement).innerText?.trim() || (el as HTMLInputElement).value || "")
            .filter(Boolean);
          const links = Array.from(document.querySelectorAll("a[href]"))
            .slice(0, 30)
            .map((a) => ({ text: (a as HTMLElement).innerText?.trim().slice(0, 60), href: (a as HTMLAnchorElement).href }));
          const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
            .map((h) => (h as HTMLElement).innerText?.trim())
            .filter(Boolean)
            .slice(0, 10);
          return JSON.stringify({
            title: document.title,
            headings,
            buttons: [...new Set(buttons)].slice(0, 20),
            links: links.slice(0, 20),
          });
        });
        return JSON.stringify({ success: true, snapshot: JSON.parse(snapshot) });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return JSON.stringify({ success: false, error: msg });
      }
    },
  },
];

/**
 * Whether the current request has an active browser session (so browser tools can run).
 */
export function hasBrowserSession(): boolean {
  return getBrowserSession() !== undefined;
}
