/**
 * Tool wrappers for agents. Agents call these by name.
 * All functions are typed and production-ready.
 */

import type { IntegrationService } from '../services/integration-service.js';
import type {
  SendEmailResult,
  ScheduleMeetingInput,
  SendSmsResult,
  CallResult,
  UploadFileResult,
} from '../integrations/types.js';

export interface AgentToolContext {
  integrationService: IntegrationService;
  /** Current user id for Google OAuth (Gmail, Calendar, Drive). */
  userId?: string;
}

/** Send a single email. Uses Gmail if userId has tokens, else SendGrid. */
export async function send_email(
  ctx: AgentToolContext,
  params: {
    to: string | string[];
    subject: string;
    body: string;
    bodyHtml?: string;
    from?: { email: string; name?: string };
    replyTo?: string;
    cc?: string[];
    bcc?: string[];
  }
): Promise<SendEmailResult> {
  return ctx.integrationService.sendEmail(
    {
      to: params.to,
      subject: params.subject,
      body: params.body,
      bodyHtml: params.bodyHtml,
      from: params.from,
      replyTo: params.replyTo,
      cc: params.cc,
      bcc: params.bcc,
    },
    { userId: ctx.userId }
  );
}

/** Schedule a meeting (Google Calendar). Requires ctx.userId with Google OAuth. */
export async function schedule_meeting(
  ctx: AgentToolContext,
  params: ScheduleMeetingInput & { calendarId?: string; timeZone?: string }
): Promise<{ success: boolean; event?: { id: string; summary: string; start: string; end: string; htmlLink?: string; status: string }; error?: string }> {
  if (!ctx.userId) {
    return { success: false, error: 'userId required for schedule_meeting' };
  }
  const { calendarId, timeZone, ...input } = params;
  const result = await ctx.integrationService.scheduleMeeting(input, ctx.userId, {
    calendarId,
    timeZone,
  });
  return result;
}

/** Send SMS (Twilio). */
export async function send_sms(
  ctx: AgentToolContext,
  params: { to: string; body: string; from?: string }
): Promise<SendSmsResult> {
  return ctx.integrationService.sendSms(params.to, params.body, params.from);
}

/** Initiate outbound call (Twilio). Provide TwiML URL that returns voice instructions. */
export async function call_customer(
  ctx: AgentToolContext,
  params: { to: string; twimlUrl: string; from?: string; statusCallback?: string }
): Promise<CallResult> {
  return ctx.integrationService.callCustomer(params.to, params.twimlUrl, {
    from: params.from,
    statusCallback: params.statusCallback,
  });
}

/** Upload a file to Google Drive. Requires ctx.userId with Google OAuth. */
export async function upload_file(
  ctx: AgentToolContext,
  params: {
    name: string;
    mimeType: string;
    content: Buffer | NodeJS.ReadableStream;
    parentId?: string;
  }
): Promise<UploadFileResult> {
  if (!ctx.userId) {
    return { success: false, error: 'userId required for upload_file' };
  }
  return ctx.integrationService.uploadFile(
    {
      name: params.name,
      mimeType: params.mimeType,
      content: params.content,
      parentId: params.parentId,
    },
    ctx.userId
  );
}

/** Registry of tool names to async functions for agent dispatch. */
export const agentTools = {
  send_email,
  schedule_meeting,
  send_sms,
  call_customer,
  upload_file,
} as const;

export type AgentToolName = keyof typeof agentTools;
