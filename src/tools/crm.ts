import { getLeads, updateLeadStatus } from "./leads.js";
import { logReportSection } from "./report.js";

// Demo: update in-memory lead status. Replace with real CRM API in production.
export async function updateCrm(
  leadIds: string[],
  updates: Record<string, unknown>
): Promise<string> {
  const status = updates?.status as string | undefined;
  if (status) {
    for (const id of leadIds) updateLeadStatus(id, status);
  }
  console.log(`[CRM] Updated ${leadIds.length} lead(s):`, updates);
  const summary = `Updated CRM for ${leadIds.length} lead(s): ${JSON.stringify(updates)}.`;
  logReportSection("CRM updates", summary);
  return summary;
}

export function getCrmLeadIds(): string[] {
  return getLeads().map((l) => l.id);
}
