/**
 * Create a test calendar event for tomorrow using the app's Google integration.
 * Run from project root: npx tsx scripts/create-calendar-event.ts
 * Requires Google to be connected (Integrations → Connect with Google).
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Load .env from project root so GOOGLE_* and token store path are set
const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) {
      const key = m[1];
      const val = m[2].replace(/^["']|["']$/g, "").trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const DEFAULT_USER_ID = "default";

function getTomorrowISO(hour: number, durationMinutes: number, tz = "America/New_York"): { start: string; end: string } {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const start = new Date(tomorrow);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + durationMinutes);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

async function main() {
  const { IntegrationService } = await import("../src/services/integration-service");
  const { defaultTokenStore } = await import("../src/integrations/token-store");

  const { start, end } = getTomorrowISO(14, 60); // tomorrow 2pm, 1 hour
  const service = new IntegrationService({ tokenStore: defaultTokenStore });

  console.log("Creating calendar event for tomorrow...");
  console.log("  Summary: Test event (Master Agent OS)");
  console.log("  Start:", start);
  console.log("  End:", end);

  const result = await service.scheduleMeeting(
    {
      summary: "Test event (Master Agent OS)",
      description: "Created by scripts/create-calendar-event.ts to verify calendar integration.",
      start,
      end,
      timeZone: "America/New_York",
    },
    DEFAULT_USER_ID
  );

  if (result.success && result.event) {
    console.log("\nEvent created successfully.");
    console.log("  ID:", result.event.id);
    console.log("  Link:", result.event.htmlLink ?? "(open Google Calendar to view)");
  } else {
    console.error("\nFailed:", result.error ?? "Unknown error");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
