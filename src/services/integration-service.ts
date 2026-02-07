/**
 * Integration service layer: orchestrates Google, Twilio, SendGrid with token storage and refresh.
 */

import type { ITokenStore } from '@/integrations/types';
import type {
  SendEmailResult,
  ScheduleMeetingInput,
  CalendarEventResult,
  SendSmsResult,
  CallResult,
  UploadFileResult,
  BulkEmailInput,
  BulkEmailResult,
} from '@/integrations/types';
import { getAuthenticatedGoogleClient } from '@/integrations/google/auth';
import { gmailSend } from '@/integrations/google/gmail';
import { calendarCreate, calendarList, calendarGet, calendarUpdate } from '@/integrations/google/calendar';
import { driveUpload, driveDownload } from '@/integrations/google/drive';
import { twilioSendSms, twilioInitiateCall } from '@/integrations/twilio/client';
import { sendgridSend, sendgridBulk } from '@/integrations/sendgrid/client';
import { defaultTokenStore } from '@/integrations/token-store';
import { getEnv } from '@/lib/env';

export interface IntegrationServiceConfig {
  tokenStore?: ITokenStore;
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  from?: { email: string; name?: string };
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

export interface ScheduleMeetingOptions {
  calendarId?: string;
  timeZone?: string;
}

export interface UploadFileInput {
  name: string;
  mimeType: string;
  content: Buffer | NodeJS.ReadableStream;
  parentId?: string;
}

export class IntegrationService {
  private readonly tokenStore: ITokenStore;

  constructor(config: IntegrationServiceConfig = {}) {
    this.tokenStore = config.tokenStore ?? defaultTokenStore;
  }

  /** Send a single email. Uses Gmail when userId has Google tokens; otherwise SendGrid. */
  async sendEmail(
    input: SendEmailInput,
    options?: { userId?: string }
  ): Promise<SendEmailResult> {
    if (options?.userId) {
      try {
        const auth = await getAuthenticatedGoogleClient(options.userId, {
          tokenStore: this.tokenStore,
        });
        return gmailSend(auth, {
          to: input.to,
          subject: input.subject,
          body: input.body,
          bodyHtml: input.bodyHtml,
          cc: input.cc,
          bcc: input.bcc,
        });
      } catch {
        // Fall through to SendGrid if no Google tokens
      }
    }
    const defaultFrom = {
      email: getEnv('MAIL_FROM_EMAIL') || 'noreply@example.com',
      name: getEnv('MAIL_FROM_NAME') || 'Master Agent',
    };
    const from = input.from ?? defaultFrom;
    return sendgridSend({
      to: input.to,
      from,
      subject: input.subject,
      text: input.body,
      html: input.bodyHtml ?? input.body.replace(/\n/g, '<br>'),
      replyTo: input.replyTo,
    });
  }

  /** Schedule a meeting (Google Calendar). Requires userId with Google OAuth. */
  async scheduleMeeting(
    input: ScheduleMeetingInput,
    userId: string,
    options?: ScheduleMeetingOptions
  ): Promise<{ success: boolean; event?: CalendarEventResult; error?: string }> {
    const auth = await getAuthenticatedGoogleClient(userId, {
      tokenStore: this.tokenStore,
    });
    return calendarCreate(auth, {
      ...input,
      timeZone: input.timeZone ?? options?.timeZone ?? 'UTC',
    }, options?.calendarId);
  }

  /** List calendar events for a user. */
  async listCalendarEvents(
    userId: string,
    options?: { calendarId?: string; timeMin?: string; timeMax?: string; maxResults?: number }
  ): Promise<CalendarEventResult[]> {
    const auth = await getAuthenticatedGoogleClient(userId, {
      tokenStore: this.tokenStore,
    });
    return calendarList(auth, options);
  }

  /** Get or update a calendar event. */
  async getCalendarEvent(userId: string, eventId: string, calendarId?: string): Promise<CalendarEventResult | null> {
    const auth = await getAuthenticatedGoogleClient(userId, { tokenStore: this.tokenStore });
    return calendarGet(auth, eventId, calendarId);
  }

  async updateCalendarEvent(
    userId: string,
    eventId: string,
    input: Partial<ScheduleMeetingInput>,
    calendarId?: string
  ): Promise<{ success: boolean; event?: CalendarEventResult; error?: string }> {
    const auth = await getAuthenticatedGoogleClient(userId, { tokenStore: this.tokenStore });
    return calendarUpdate(auth, eventId, input, calendarId);
  }

  /** Send SMS (Twilio). */
  async sendSms(to: string, body: string, from?: string): Promise<SendSmsResult> {
    return twilioSendSms({ to, body, from });
  }

  /** Initiate outbound call (Twilio). url must be a TwiML URL. */
  async callCustomer(to: string, twimlUrl: string, options?: { from?: string; statusCallback?: string }): Promise<CallResult> {
    return twilioInitiateCall({
      to,
      url: twimlUrl,
      from: options?.from,
      statusCallback: options?.statusCallback,
    });
  }

  /** Upload file to Google Drive. Requires userId with Google OAuth. */
  async uploadFile(input: UploadFileInput, userId: string): Promise<UploadFileResult> {
    const auth = await getAuthenticatedGoogleClient(userId, {
      tokenStore: this.tokenStore,
    });
    return driveUpload(auth, {
      name: input.name,
      mimeType: input.mimeType,
      body: input.content,
      parentId: input.parentId,
    });
  }

  /** Download file from Google Drive. */
  async downloadFile(userId: string, fileId: string): Promise<{ success: boolean; data?: Buffer; mimeType?: string; error?: string }> {
    const auth = await getAuthenticatedGoogleClient(userId, { tokenStore: this.tokenStore });
    return driveDownload(auth, fileId);
  }

  /** Bulk email campaign (SendGrid). */
  async sendBulkEmail(input: BulkEmailInput): Promise<BulkEmailResult> {
    return sendgridBulk(input);
  }
}
