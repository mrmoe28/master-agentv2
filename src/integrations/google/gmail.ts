/**
 * Gmail: send and read messages.
 */

import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import type { SendEmailResult } from '../types';
import { getErrorMessage } from '@/utils/errors';

export interface GmailSendInput {
  to: string | string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  cc?: string[];
  bcc?: string[];
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet?: string;
  labelIds?: string[];
  internalDate?: string;
}

/**
 * Validate an email address format (basic validation).
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate email addresses in the input.
 */
function validateEmailAddresses(input: GmailSendInput): string | null {
  const allAddresses = [
    ...(Array.isArray(input.to) ? input.to : [input.to]),
    ...(input.cc ?? []),
    ...(input.bcc ?? []),
  ];

  for (const addr of allAddresses) {
    if (!isValidEmail(addr)) {
      return `Invalid email address: ${addr}`;
    }
  }

  return null;
}

/** Send email via Gmail. */
export async function gmailSend(
  auth: OAuth2Client,
  input: GmailSendInput
): Promise<SendEmailResult> {
  // Validate email addresses
  const validationError = validateEmailAddresses(input);
  if (validationError) {
    return { success: false, error: validationError };
  }

  try {
    const gmail = google.gmail({ version: 'v1', auth });
    const to = Array.isArray(input.to) ? input.to.join(', ') : input.to;
    const cc = input.cc?.length ? input.cc.join(', ') : '';
    const bcc = input.bcc?.length ? input.bcc.join(', ') : '';
    const headers = [
      `To: ${to}`,
      cc ? `Cc: ${cc}` : '',
      bcc ? `Bcc: ${bcc}` : '',
      `Subject: ${input.subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
    ]
      .filter(Boolean)
      .join('\r\n');
    const bodyContent = input.bodyHtml ?? input.body.replace(/\n/g, '<br>');
    // RFC 2822: blank line required between headers and body
    const raw = headers + '\r\n\r\n' + bodyContent;
    const encoded = Buffer.from(raw, 'utf8').toString('base64url');
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encoded },
    });
    return { success: true, messageId: res.data.id ?? undefined };
  } catch (err) {
    const msg = getErrorMessage(err);
    const isUnauthorized =
      msg.toLowerCase().includes('unauthorized') ||
      (err as { response?: { status?: number } })?.response?.status === 401;
    const error = isUnauthorized
      ? 'Gmail send permission missing or token expired. Use "Reconnect with Google" on the Integrations page to grant Gmail send access.'
      : msg;
    return { success: false, error };
  }
}

/** List messages (read). */
export async function gmailList(
  auth: OAuth2Client,
  options: { maxResults?: number; q?: string; pageToken?: string } = {}
): Promise<{ messages: GmailMessageSummary[]; nextPageToken?: string }> {
  try {
    const gmail = google.gmail({ version: 'v1', auth });
    const res = await gmail.users.messages.list({
      userId: 'me',
      maxResults: options.maxResults ?? 20,
      q: options.q,
      pageToken: options.pageToken,
    });

    const list = (res.data.messages ?? []).map((m) => ({
      id: m.id ?? '',
      threadId: m.threadId ?? '',
      snippet: m.snippet ?? undefined,
      labelIds: m.labelIds ?? undefined,
      internalDate: m.internalDate ?? undefined,
    })).filter((m) => m.id); // Filter out items without id

    return { messages: list, nextPageToken: res.data.nextPageToken ?? undefined };
  } catch (err) {
    console.error(`[Gmail] Failed to list messages: ${getErrorMessage(err)}`);
    return { messages: [], nextPageToken: undefined };
  }
}

/** Get a single message body. */
export async function gmailGet(
  auth: OAuth2Client,
  messageId: string
): Promise<{ id: string; threadId: string; snippet?: string; body?: string; bodyHtml?: string } | null> {
  if (!messageId) {
    console.warn('[Gmail] gmailGet called without messageId');
    return null;
  }

  try {
    const gmail = google.gmail({ version: 'v1', auth });
    const res = await gmail.users.messages.get({ userId: 'me', id: messageId });

    const payload = res.data.payload;
    const parts = payload?.parts ?? (payload?.body ? [payload] : []);
    let body = '';
    let bodyHtml = '';

    for (const p of parts) {
      if (p.body?.data) {
        const decoded = Buffer.from(p.body.data, 'base64url').toString('utf8');
        if (p.mimeType === 'text/html') bodyHtml = decoded;
        else body = decoded;
      }
    }

    if (!body && payload?.body?.data) {
      body = Buffer.from(payload.body.data, 'base64url').toString('utf8');
    }

    return {
      id: res.data.id ?? messageId,
      threadId: res.data.threadId ?? '',
      snippet: res.data.snippet ?? undefined,
      body: body || undefined,
      bodyHtml: bodyHtml || undefined,
    };
  } catch (err) {
    console.error(`[Gmail] Failed to get message ${messageId}: ${getErrorMessage(err)}`);
    return null;
  }
}
