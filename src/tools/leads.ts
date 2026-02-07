// In-memory lead store for demo. Replace with real CRM/API in production.
interface Lead {
  id: string;
  email: string;
  name: string;
  status: string;
  source?: string;
}

let leads: Lead[] = [];

const DEMO_LEADS: Lead[] = [
  { id: "L1", email: "alice@example.com", name: "Alice", status: "new", source: "demo" },
  { id: "L2", email: "bob@example.com", name: "Bob", status: "new", source: "demo" },
  { id: "L3", email: "carol@example.com", name: "Carol", status: "new", source: "demo" },
];

import { logReportSection } from "./report.js";

export function parseLeads(source?: string): string {
  leads = [...DEMO_LEADS];
  const summary = `Parsed ${leads.length} leads: ${leads.map((l) => `${l.name} (${l.email})`).join(", ")}.`;
  logReportSection("Leads organized", summary);
  return summary;
}

export function getLeads(): Lead[] {
  if (leads.length === 0) leads = [...DEMO_LEADS];
  return leads;
}

export function getLeadsSummary(): string {
  const l = getLeads();
  return `Total leads: ${l.length}. Statuses: ${[...new Set(l.map((x) => x.status))].join(", ")}.`;
}

export function updateLeadStatus(leadId: string, status: string): void {
  const l = leads.find((x) => x.id === leadId);
  if (l) l.status = status;
}
