/**
 * Integration tool definitions for the in-app chat (send_email via Gmail/SendGrid).
 * The chat API must set integration context (IntegrationService + userId) before calling chatWithTools.
 */

import type { ChatToolDef } from "./client";
import { getIntegrationContext } from "@/integration-context";
import { send_email } from "@/tools/index";

export const chatIntegrationToolDefs: ChatToolDef[] = [
  {
    name: "send_email",
    description:
      "Send a single email. Uses the connected Gmail account if available, otherwise SendGrid. Provide recipient(s), subject, and body. The body must contain the full message text the user asked to send—never leave it empty. Always use the recipient the user specified (e.g. if they said 'only send to X', use X as 'to'); do not use other addresses from context unless the user explicitly asks.",
    parameters: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "Recipient email address (must match any address the user said to use, e.g. 'only send to this email'); or comma-separated if user allowed multiple",
        },
        subject: { type: "string", description: "Email subject" },
        body: {
          type: "string",
          description:
            "Full email message body (plain text). Must contain the actual message the user asked you to send; do not omit or leave empty.",
        },
        bodyHtml: {
          type: "string",
          description: "Optional HTML body (if not set, plain body is used)",
        },
      },
      required: ["to", "subject", "body"],
    },
    execute: async (args) => {
      const ctx = getIntegrationContext();
      if (!ctx?.integrationService) {
        return JSON.stringify({
          success: false,
          error:
            "Email not configured. Connect Google (Gmail) or set SendGrid in Integrations.",
        });
      }
      const to = args.to;
      const toList =
        typeof to === "string"
          ? to.split(",").map((s) => s.trim()).filter(Boolean)
          : Array.isArray(to)
            ? (to as string[])
            : [String(to ?? "")];
      if (toList.length === 0 || !toList[0]) {
        return JSON.stringify({ success: false, error: "Recipient (to) is required." });
      }
      // Accept body from common parameter names (LLMs sometimes use "content" or "message")
      const rawBody =
        args.body ??
        args.content ??
        args.message ??
        args.text ??
        "";
      const body = String(rawBody).trim();

      if (!body) {
        return JSON.stringify({
          success: false,
          error:
            "Email body is required. Put the full message text in the 'body' parameter and try again.",
        });
      }

      const result = await send_email(
        {
          integrationService: ctx.integrationService,
          userId: ctx.userId ?? "default",
        },
        {
          to: toList.length === 1 ? toList[0] : toList,
          subject: String(args.subject ?? ""),
          body,
          bodyHtml: typeof args.bodyHtml === "string" ? args.bodyHtml : undefined,
        }
      );
      return JSON.stringify(result);
    },
  },
  {
    name: "schedule_meeting",
    description:
      "Add an event to the user's Google Calendar. Use when the user asks to add a calendar event, schedule a meeting, create an event, or put something on their calendar. Requires Google connected in Integrations. Provide summary (title), start and end as ISO 8601 datetime strings (e.g. 2025-02-08T14:00:00 or 2025-02-08T14:00:00-05:00). Optionally include description and attendees (comma-separated emails).",
    parameters: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "Event title/summary",
        },
        start: {
          type: "string",
          description:
            "Start time in ISO 8601 format, e.g. 2025-02-08T14:00:00 or 2025-02-08T14:00:00-05:00",
        },
        end: {
          type: "string",
          description:
            "End time in ISO 8601 format, e.g. 2025-02-08T15:00:00 or 2025-02-08T15:00:00-05:00",
        },
        description: {
          type: "string",
          description: "Optional event description",
        },
        attendees: {
          type: "string",
          description:
            "Optional comma-separated email addresses of attendees",
        },
        timeZone: {
          type: "string",
          description:
            "Optional IANA time zone (e.g. America/New_York). If omitted, times are interpreted in the user's calendar time zone.",
        },
      },
      required: ["summary", "start", "end"],
    },
    execute: async (args) => {
      const ctx = getIntegrationContext();
      if (!ctx?.integrationService) {
        return JSON.stringify({
          success: false,
          error:
            "Google Calendar not configured. Connect Google in Integrations.",
        });
      }
      const summary = String(args.summary ?? "").trim();
      const start = String(args.start ?? "").trim();
      const end = String(args.end ?? "").trim();
      if (!summary || !start || !end) {
        return JSON.stringify({
          success: false,
          error: "summary, start, and end are required.",
        });
      }
      const attendeesStr = args.attendees;
      const attendees =
        typeof attendeesStr === "string"
          ? attendeesStr
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : Array.isArray(args.attendees)
            ? (args.attendees as string[]).filter(Boolean)
            : undefined;
      const result = await ctx.integrationService.scheduleMeeting(
        {
          summary,
          start,
          end,
          description:
            typeof args.description === "string"
              ? args.description.trim() || undefined
              : undefined,
          attendees: attendees?.length ? attendees : undefined,
          timeZone:
            typeof args.timeZone === "string"
              ? args.timeZone.trim() || undefined
              : undefined,
        },
        ctx.userId ?? "default",
        typeof args.calendarId === "string" && args.calendarId.trim()
          ? { calendarId: args.calendarId.trim() }
          : undefined
      );
      return JSON.stringify(result);
    },
  },
];
