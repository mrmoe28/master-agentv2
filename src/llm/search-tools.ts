/**
 * Web search: Google Custom Search API (preferred if keys set) or Serper API fallback.
 * Google: set GOOGLE_API_KEY + GOOGLE_CUSTOM_SEARCH_ENGINE_ID (Programmable Search Engine).
 * Serper: set SERPER_API_KEY (serper.dev).
 */

import type { ChatToolDef } from "./client";
import { getEnv } from "@/lib/env";

const SERPER_URL = "https://google.serper.dev/search";
const GOOGLE_CUSTOM_SEARCH_URL = "https://www.googleapis.com/customsearch/v1";

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

export type WebSearchResult = {
  success: boolean;
  results?: SearchResult[];
  answerBox?: string;
  error?: string;
};

function getGoogleSearchConfig(): { apiKey: string; cx: string } | null {
  const apiKey = getEnv("GOOGLE_API_KEY")?.trim();
  const cx = getEnv("GOOGLE_CUSTOM_SEARCH_ENGINE_ID")?.trim();
  if (apiKey && cx) return { apiKey, cx };
  return null;
}

function getSerperApiKey(): string | null {
  const key = getEnv("SERPER_API_KEY")?.trim();
  return key && key.length > 0 ? key : null;
}

/** Google Custom Search JSON API (100 free queries/day). Requires API key + Programmable Search Engine ID (cx). */
async function googleCustomSearch(
  query: string,
  num: number
): Promise<WebSearchResult> {
  const config = getGoogleSearchConfig();
  if (!config) {
    return {
      success: false,
      error:
        "Google search not configured. Set GOOGLE_API_KEY and GOOGLE_CUSTOM_SEARCH_ENGINE_ID in Settings → API keys. Enable Custom Search API in Google Cloud; create a Programmable Search Engine at programmablesearchengine.google.com to get the engine ID.",
    };
  }

  const q = (query || "").trim();
  if (!q) return { success: false, error: "Search query is required." };

  try {
    const params = new URLSearchParams({
      key: config.apiKey,
      cx: config.cx,
      q,
      num: String(Math.min(10, Math.max(1, num))),
    });
    const res = await fetch(`${GOOGLE_CUSTOM_SEARCH_URL}?${params}`, {
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        success: false,
        error: `Google Search API error ${res.status}: ${text.slice(0, 200)}`,
      };
    }

    const data = (await res.json()) as {
      items?: Array<{ title?: string; link?: string; snippet?: string }>;
    };
    const items = data.items ?? [];
    const results: SearchResult[] = items.slice(0, num).map((r) => ({
      title: String(r.title ?? ""),
      link: String(r.link ?? ""),
      snippet: String(r.snippet ?? ""),
    }));

    return { success: true, results };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: `Google search failed: ${msg}` };
  }
}

interface SerperOrganicResult {
  title?: string;
  link?: string;
  snippet?: string;
}

interface SerperResponse {
  organic?: SerperOrganicResult[];
  answerBox?: Record<string, unknown>;
}

/** Serper API (google.serper.dev). */
async function serperSearch(query: string, num: number): Promise<WebSearchResult> {
  const apiKey = getSerperApiKey();
  if (!apiKey) {
    return {
      success: false,
      error:
        "Serper not configured. Set SERPER_API_KEY in Settings → API keys, or use Google: set GOOGLE_API_KEY and GOOGLE_CUSTOM_SEARCH_ENGINE_ID.",
    };
  }

  const q = (query || "").trim();
  if (!q) return { success: false, error: "Search query is required." };

  try {
    const res = await fetch(SERPER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
      body: JSON.stringify({ q, num }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        success: false,
        error: `Search API error ${res.status}: ${text.slice(0, 200)}`,
      };
    }

    const data = (await res.json()) as SerperResponse;
    const organic = data.organic ?? [];
    const results: SearchResult[] = organic
      .filter((r) => r.title != null || r.link != null || r.snippet != null)
      .slice(0, num)
      .map((r) => ({
        title: String(r.title ?? ""),
        link: String(r.link ?? ""),
        snippet: String(r.snippet ?? ""),
      }));

    let answerBox: string | undefined;
    if (data.answerBox && typeof data.answerBox === "object") {
      const ab = data.answerBox as Record<string, unknown>;
      if (typeof ab.answer === "string") answerBox = ab.answer;
      else if (typeof ab.snippet === "string") answerBox = ab.snippet;
    }

    return {
      success: true,
      results,
      ...(answerBox && { answerBox }),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: `Search failed: ${msg}` };
  }
}

/**
 * Web search: prefers Google Custom Search if configured, else Serper.
 */
export async function webSearch(query: string, num: number = 8): Promise<WebSearchResult> {
  const q = (query || "").trim();
  if (!q) {
    return { success: false, error: "Search query is required." };
  }

  const googleConfig = getGoogleSearchConfig();
  if (googleConfig) {
    return googleCustomSearch(query, num);
  }

  const serperKey = getSerperApiKey();
  if (serperKey) {
    return serperSearch(query, num);
  }

  return {
    success: false,
    error:
      "Web search is not configured. Option 1 (Google): set GOOGLE_API_KEY and GOOGLE_CUSTOM_SEARCH_ENGINE_ID in Settings → API keys (enable Custom Search API in Google Cloud; create a search engine at programmablesearchengine.google.com). Option 2: set SERPER_API_KEY (serper.dev).",
  };
}

export const searchToolDefs: ChatToolDef[] = [
  {
    name: "web_search",
    description:
      "Search the web via Google. Use this for ANY user request that contains 'search for', 'look up', 'find out', 'how to', or asking for steps/facts from the web. Call web_search first with a clear query—do NOT use browser_navigate to perform a search. Only use browser_navigate when the user gives a specific URL to open. Returns titles, links, and snippets. If the tool returns a config error, tell the user to set search keys in Settings (Google: GOOGLE_API_KEY + GOOGLE_CUSTOM_SEARCH_ENGINE_ID; or Serper: SERPER_API_KEY) and do not open a browser instead.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (e.g. 'how to enable 2FA on Gmail', 'latest Node.js LTS version')",
        },
        num: {
          type: "number",
          description: "Max number of results to return (default 8, max 10)",
        },
      },
      required: ["query"],
    },
    execute: async (args) => {
      const query = String(args.query ?? "").trim();
      const num = typeof args.num === "number" ? Math.min(10, Math.max(1, args.num)) : 8;
      const out = await webSearch(query, num);
      return JSON.stringify(out);
    },
  },
];
