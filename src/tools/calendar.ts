import { logReportSection } from "./report.js";

// Demo: log and return success. Replace with real calendar API in production.
export async function scheduleMeeting(
  leadIds: string[],
  when: string,
  title?: string
): Promise<string> {
  const t = title ?? "Follow-up call";
  // In production: await calendarApi.createEvents(leadIds.map(id => ({ leadId: id, when, title: t })));
  console.log(`[CALENDAR] Scheduled ${leadIds.length} follow-up(s): ${when} - "${t}"`);
  const summary = `Scheduled ${leadIds.length} follow-up(s) for ${when}: "${t}". Lead IDs: ${leadIds.join(", ")}.`;
  logReportSection("Follow-ups scheduled", summary);
  return summary;
}
