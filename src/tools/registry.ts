import { z } from "zod";
import type { ToolDef } from "../agent-types.js";
import {
  parseLeads,
  getLeadsSummary,
} from "./leads.js";
import { sendEmail } from "./email.js";
import { scheduleMeeting } from "./calendar.js";
import { updateCrm } from "./crm.js";
import { reportResults } from "./report.js";
import { getIntegrationContext } from "../integration-context.js";
import {
  send_email,
  schedule_meeting,
  send_sms,
  call_customer,
  upload_file,
} from "./index.js";

export const tools: ToolDef[] = [
  {
    name: "parse_leads",
    description:
      "Parse and organize leads from the lead source. Returns list of leads with contact info.",
    parameters: z.object({
      source: z.string().optional().describe("Lead source identifier, e.g. 'crm_export' or 'sheet'"),
    }),
    execute: async (args) => {
      const { source } = args as { source?: string };
      return parseLeads(source);
    },
  },
  {
    name: "get_leads_summary",
    description: "Get a summary of currently loaded/organized leads (count, status).",
    parameters: z.object({}),
    execute: async () => getLeadsSummary(),
  },
  {
    name: "send_emails",
    description:
      "Send emails to leads. Provide list of recipients and optional template.",
    parameters: z.object({
      recipients: z.array(z.string()).describe("Email addresses"),
      subject: z.string().optional(),
      bodyTemplate: z.string().optional(),
    }),
    execute: async (args) => {
      const { recipients, subject, bodyTemplate } = args as {
        recipients: string[];
        subject?: string;
        bodyTemplate?: string;
      };
      return sendEmail(recipients, subject, bodyTemplate);
    },
  },
  {
    name: "schedule_followups",
    description: "Schedule follow-up meetings or reminders for leads.",
    parameters: z.object({
      leadIds: z.array(z.string()).describe("Lead identifiers"),
      when: z.string().describe("When to schedule, e.g. 'in 3 days' or 'next week'"),
      title: z.string().optional(),
    }),
    execute: async (args) => {
      const { leadIds, when, title } = args as {
        leadIds: string[];
        when: string;
        title?: string;
      };
      return scheduleMeeting(leadIds, when, title);
    },
  },
  {
    name: "update_crm",
    description: "Update CRM with lead status, notes, or activity.",
    parameters: z.object({
      leadIds: z.array(z.string()),
      updates: z.record(z.unknown()).describe("Fields to update, e.g. { status: 'contacted', lastEmailAt: '...' }"),
    }),
    execute: async (args) => {
      const { leadIds, updates } = args as {
        leadIds: string[];
        updates: Record<string, unknown>;
      };
      return updateCrm(leadIds, updates);
    },
  },
  {
    name: "report_results",
    description: "Produce a summary report of what was done (emails sent, meetings scheduled, CRM updates).",
    parameters: z.object({
      sections: z.array(z.string()).optional().describe("Report sections to include"),
    }),
    execute: async (args) => {
      const { sections } = (args ?? {}) as { sections?: string[] };
      return reportResults(sections);
    },
  },
  // Integration tools (Google, Twilio, SendGrid). Set integration context for production.
  {
    name: "send_email",
    description: "Send a single email. Uses Gmail if user has OAuth; otherwise SendGrid.",
    parameters: z.object({
      to: z.union([z.string(), z.array(z.string())]).describe("Recipient(s)"),
      subject: z.string(),
      body: z.string(),
      bodyHtml: z.string().optional(),
      from: z.object({ email: z.string(), name: z.string().optional() }).optional(),
      replyTo: z.string().optional(),
      cc: z.array(z.string()).optional(),
      bcc: z.array(z.string()).optional(),
    }),
    execute: async (args) => {
      const ctx = getIntegrationContext();
      if (!ctx?.integrationService) return JSON.stringify({ success: false, error: "Integration not configured" });
      const result = await send_email(
        { integrationService: ctx.integrationService, userId: ctx.userId },
        args as Parameters<typeof send_email>[1]
      );
      return JSON.stringify(result);
    },
  },
  {
    name: "schedule_meeting",
    description: "Schedule a meeting (Google Calendar). Requires Google OAuth for user.",
    parameters: z.object({
      summary: z.string(),
      description: z.string().optional(),
      start: z.string().describe("ISO datetime"),
      end: z.string().describe("ISO datetime"),
      attendees: z.array(z.string()).optional(),
      timeZone: z.string().optional(),
      calendarId: z.string().optional(),
    }),
    execute: async (args) => {
      const ctx = getIntegrationContext();
      if (!ctx?.integrationService) return JSON.stringify({ success: false, error: "Integration not configured" });
      const result = await schedule_meeting(
        { integrationService: ctx.integrationService, userId: ctx.userId },
        args as Parameters<typeof schedule_meeting>[1]
      );
      return JSON.stringify(result);
    },
  },
  {
    name: "send_sms",
    description: "Send SMS (Twilio).",
    parameters: z.object({
      to: z.string(),
      body: z.string(),
      from: z.string().optional(),
    }),
    execute: async (args) => {
      const ctx = getIntegrationContext();
      if (!ctx?.integrationService) return JSON.stringify({ success: false, error: "Integration not configured" });
      const result = await send_sms(
        { integrationService: ctx.integrationService },
        args as Parameters<typeof send_sms>[1]
      );
      return JSON.stringify(result);
    },
  },
  {
    name: "call_customer",
    description: "Initiate outbound call (Twilio). Provide TwiML URL for voice instructions.",
    parameters: z.object({
      to: z.string(),
      twimlUrl: z.string(),
      from: z.string().optional(),
      statusCallback: z.string().optional(),
    }),
    execute: async (args) => {
      const ctx = getIntegrationContext();
      if (!ctx?.integrationService) return JSON.stringify({ success: false, error: "Integration not configured" });
      const result = await call_customer(
        { integrationService: ctx.integrationService },
        args as Parameters<typeof call_customer>[1]
      );
      return JSON.stringify(result);
    },
  },
  {
    name: "upload_file",
    description: "Upload a file to Google Drive. Requires Google OAuth for user.",
    parameters: z.object({
      name: z.string(),
      mimeType: z.string(),
      content: z.any().describe("Buffer or ReadableStream; in JSON pass base64 string for Buffer"),
      parentId: z.string().optional(),
    }),
    execute: async (args) => {
      const ctx = getIntegrationContext();
      if (!ctx?.integrationService) return JSON.stringify({ success: false, error: "Integration not configured" });
      const raw = args as { name: string; mimeType: string; content: unknown; parentId?: string };
      const content =
        typeof raw.content === "string"
          ? Buffer.from(raw.content, "base64")
          : (raw.content as Buffer | NodeJS.ReadableStream);
      const result = await upload_file(
        { integrationService: ctx.integrationService, userId: ctx.userId },
        { name: raw.name, mimeType: raw.mimeType, content, parentId: raw.parentId }
      );
      return JSON.stringify(result);
    },
  },
];

export function getTool(name: string): ToolDef | undefined {
  return tools.find((t) => t.name === name);
}

export function getToolsDescription(): string {
  return tools
    .map(
      (t) =>
        `- ${t.name}: ${t.description} (params: ${JSON.stringify((t.parameters as any).key ?? "varies")})`
    )
    .join("\n");
}
