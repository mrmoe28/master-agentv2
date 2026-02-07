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
];
