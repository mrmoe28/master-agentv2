/**
 * Twilio: send SMS and initiate calls.
 * Env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER (or set in Settings → API keys).
 */

import Twilio from 'twilio';
import { getEnv } from '@/lib/env';
import type { SendSmsResult, CallResult } from '../types.js';

let twilioClient: Twilio.Twilio | null = null;

function getClient(): Twilio.Twilio {
  if (twilioClient) return twilioClient;
  const sid = getEnv('TWILIO_ACCOUNT_SID');
  const token = getEnv('TWILIO_AUTH_TOKEN');
  if (!sid || !token) {
    throw new Error('Twilio config missing: set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN');
  }
  twilioClient = Twilio(sid, token);
  return twilioClient;
}

function getFromNumber(): string {
  const from = getEnv('TWILIO_PHONE_NUMBER');
  if (!from) throw new Error('TWILIO_PHONE_NUMBER is required for SMS and calls');
  return from;
}

export interface TwilioSmsInput {
  to: string;
  body: string;
  from?: string;
}

/** Send SMS. */
export async function twilioSendSms(input: TwilioSmsInput): Promise<SendSmsResult> {
  try {
    const client = getClient();
    const from = input.from ?? getFromNumber();
    const msg = await client.messages.create({
      to: input.to,
      from,
      body: input.body,
    });
    return { success: true, sid: msg.sid ?? undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

export interface TwilioCallInput {
  to: string;
  url: string; // TwiML URL or static TwiML
  from?: string;
  method?: 'GET' | 'POST';
  statusCallback?: string;
}

/** Initiate an outbound call. url must be a TwiML URL that returns instructions. */
export async function twilioInitiateCall(input: TwilioCallInput): Promise<CallResult> {
  try {
    const client = getClient();
    const from = input.from ?? getFromNumber();
    const call = await client.calls.create({
      to: input.to,
      from,
      url: input.url,
      method: input.method ?? 'GET',
      statusCallback: input.statusCallback,
    });
    return { success: true, callSid: call.sid ?? undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

/** Reset client (e.g. for tests or config change). */
export function resetTwilioClient(): void {
  twilioClient = null;
}
