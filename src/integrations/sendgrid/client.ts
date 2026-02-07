/**
 * SendGrid: bulk email campaigns.
 * Env: SENDGRID_API_KEY (or set in Settings → API keys).
 */

import sgMail from '@sendgrid/mail';
import { getEnv } from '@/lib/env';
import type { BulkEmailInput, BulkEmailResult, SendEmailResult } from '../types.js';

let initialized = false;

function ensureInit(): void {
  if (initialized) return;
  const key = getEnv('SENDGRID_API_KEY');
  if (!key) throw new Error('SENDGRID_API_KEY is required');
  sgMail.setApiKey(key);
  initialized = true;
}

/** Send a single email via SendGrid. */
export async function sendgridSend(input: {
  to: string | string[];
  from: { email: string; name?: string };
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}): Promise<SendEmailResult> {
  try {
    ensureInit();
    const [res] = await sgMail.send({
      to: Array.isArray(input.to) ? input.to : [input.to],
      from: input.from,
      subject: input.subject,
      text: input.text ?? '',
      html: input.html,
      replyTo: input.replyTo,
    });
    const messageId = res.headers?.['x-message-id'];
    return { success: true, messageId: Array.isArray(messageId) ? messageId[0] : messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

/** Bulk email campaign: send to many recipients. Per-recipient errors are collected. */
export async function sendgridBulk(input: BulkEmailInput): Promise<BulkEmailResult> {
  ensureInit();
  const errors: Array<{ email: string; reason: string }> = [];
  let acceptedCount = 0;
  for (const r of input.recipients) {
    try {
      await sgMail.send({
        to: r.email,
        from: input.from,
        subject: input.subject,
        text: input.textContent,
        html: input.htmlContent,
        replyTo: input.replyTo,
      });
      acceptedCount++;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      errors.push({ email: r.email, reason });
    }
  }
  return {
    success: errors.length === 0,
    acceptedCount,
    rejectedCount: errors.length,
    errors,
  };
}
