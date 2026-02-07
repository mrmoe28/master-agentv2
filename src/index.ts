/**
 * Master Agent OS – integrations and agent tools.
 *
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI,
 *      TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER,
 *      SENDGRID_API_KEY, TOKEN_ENCRYPTION_KEY (optional).
 */

export type {
  ProviderId,
  StoredTokens,
  TokenRecord,
  ITokenStore,
  SendEmailResult,
  ScheduleMeetingInput,
  CalendarEventResult,
  SendSmsResult,
  CallResult,
  UploadFileResult,
  BulkEmailInput,
  BulkEmailResult,
} from './integrations/types.js';

export { MemoryTokenStore, defaultTokenStore } from './integrations/token-store.js';
export {
  createGoogleOAuth2Client,
  getGoogleAuthUrl,
  exchangeCodeForTokens,
  getAuthenticatedGoogleClient,
} from './integrations/google/auth.js';
export type { GoogleAuthConfig } from './integrations/google/auth.js';
export { gmailSend, gmailList, gmailGet } from './integrations/google/gmail.js';
export type { GmailSendInput, GmailMessageSummary } from './integrations/google/gmail.js';
export { calendarCreate, calendarList, calendarGet, calendarUpdate } from './integrations/google/calendar.js';
export { driveUpload, driveDownload } from './integrations/google/drive.js';
export type { DriveUploadInput } from './integrations/google/drive.js';
export { twilioSendSms, twilioInitiateCall, resetTwilioClient } from './integrations/twilio/client.js';
export type { TwilioSmsInput, TwilioCallInput } from './integrations/twilio/client.js';
export { sendgridSend, sendgridBulk } from './integrations/sendgrid/client.js';

export { IntegrationService } from './services/integration-service.js';
export type {
  IntegrationServiceConfig,
  SendEmailInput,
  ScheduleMeetingOptions,
  UploadFileInput,
} from './services/integration-service.js';

export {
  send_email,
  schedule_meeting,
  send_sms,
  call_customer,
  upload_file,
  agentTools,
} from './tools/index.js';
export type { AgentToolContext, AgentToolName } from './tools/index.js';
