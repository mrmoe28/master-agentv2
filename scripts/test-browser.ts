/**
 * Test the browser session: launches a visible Chrome, navigates to a URL, returns the page title.
 * Run: npm run test:browser
 * You should see a Chrome window open, load example.com, then close after a few seconds.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { testBrowserSession } from "../src/browser-session";

function loadEnv(): void {
  const path = resolve(process.cwd(), ".env");
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const url = process.argv[2] || "https://example.com";

console.log("Testing browser session (you should see a Chrome window open):", url);

testBrowserSession(url)
  .then((result) => {
    if (result.ok) {
      console.log("OK — title:", result.title ?? "(no title)");
      process.exit(0);
    } else {
      console.error("FAIL:", result.error);
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error("FAIL:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
