/**
 * Shared types for Master Agent OS integrations.
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI,
 *      TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER,
 *      SENDGRID_API_KEY, TOKEN_ENCRYPTION_KEY (optional).
 */

export type ProviderId = 'google' | 'twilio' | 'sendgrid';

/** Stored OAuth credentials (Google). */
export interface StoredTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  scope?: string;
}

/** Per-user/provider token record. */
export interface TokenRecord {
  provider: ProviderId;
  userId: string;
  tokens: StoredTokens;
  updatedAt: string; // ISO
}

/** Token storage abstraction: persist and retrieve OAuth tokens. */
export interface ITokenStore {
  get(provider: ProviderId, userId: string): Promise<StoredTokens | null>;
  set(provider: ProviderId, userId: string, tokens: StoredTokens): Promise<void>;
  delete(provider: ProviderId, userId: string): Promise<void>;
}

/** Result of sending a single email (Gmail or SendGrid). */
export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/** Input for scheduling a meeting (Google Calendar). */
export interface ScheduleMeetingInput {
  summary: string;
  description?: string;
  start: string; // ISO datetime
  end: string;   // ISO datetime
  attendees?: string[];
  timeZone?: string;
}

/** Calendar event as returned from API. */
export interface CalendarEventResult {
  id: string;
  summary: string;
  start: string;
  end: string;
  htmlLink?: string;
  status: string;
}

/** SMS send result. */
export interface SendSmsResult {
  success: boolean;
  sid?: string;
  error?: string;
}

/** Voice call result. */
export interface CallResult {
  success: boolean;
  callSid?: string;
  error?: string;
}

/** File upload result (Google Drive). */
export interface UploadFileResult {
  success: boolean;
  fileId?: string;
  webViewLink?: string;
  error?: string;
}

/** Bulk email campaign input (SendGrid). */
export interface BulkEmailInput {
  subject: string;
  htmlContent: string;
  textContent?: string;
  recipients: Array<{ email: string; name?: string }>;
  from: { email: string; name?: string };
  replyTo?: string;
}

/** Bulk email campaign result. */
export interface BulkEmailResult {
  success: boolean;
  acceptedCount: number;
  rejectedCount: number;
  errors: Array<{ email: string; reason: string }>;
}
