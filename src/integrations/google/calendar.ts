/**
 * Google Calendar: create, read, update events.
 */

import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import type { ScheduleMeetingInput, CalendarEventResult } from '../types';
import { getErrorMessage } from '@/utils/errors';

const DEFAULT_CALENDAR_ID = 'primary';

/**
 * Validate ISO 8601 datetime format (basic validation).
 */
function isValidDatetime(datetime: string): boolean {
  const date = new Date(datetime);
  return !isNaN(date.getTime());
}

/**
 * Validate meeting input.
 */
function validateMeetingInput(input: ScheduleMeetingInput): string | null {
  if (!input.summary || input.summary.trim().length === 0) {
    return 'Meeting summary is required';
  }

  if (!isValidDatetime(input.start)) {
    return `Invalid start datetime: ${input.start}`;
  }

  if (!isValidDatetime(input.end)) {
    return `Invalid end datetime: ${input.end}`;
  }

  const startDate = new Date(input.start);
  const endDate = new Date(input.end);
  if (endDate <= startDate) {
    return 'End time must be after start time';
  }

  return null;
}

/** Create a calendar event (schedule meeting). */
export async function calendarCreate(
  auth: OAuth2Client,
  input: ScheduleMeetingInput,
  calendarId: string = DEFAULT_CALENDAR_ID
): Promise<{ success: boolean; event?: CalendarEventResult; error?: string }> {
  // Validate input
  const validationError = validateMeetingInput(input);
  if (validationError) {
    return { success: false, error: validationError };
  }

  try {
    const calendar = google.calendar({ version: 'v3', auth });
    const res = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: input.summary,
        description: input.description,
        start: {
          dateTime: input.start,
          timeZone: input.timeZone ?? 'UTC',
        },
        end: {
          dateTime: input.end,
          timeZone: input.timeZone ?? 'UTC',
        },
        attendees: input.attendees?.map((e) => ({ email: e })),
      },
    });
    const e = res.data;
    return {
      success: true,
      event: {
        id: e.id ?? '',
        summary: e.summary ?? '',
        start: e.start?.dateTime ?? e.start?.date ?? '',
        end: e.end?.dateTime ?? e.end?.date ?? '',
        htmlLink: e.htmlLink ?? undefined,
        status: e.status ?? 'confirmed',
      },
    };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

/** List events. */
export async function calendarList(
  auth: OAuth2Client,
  options: {
    calendarId?: string;
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    singleEvents?: boolean;
    orderBy?: 'startTime' | 'updated';
  } = {}
): Promise<CalendarEventResult[]> {
  try {
    const calendar = google.calendar({ version: 'v3', auth });
    const res = await calendar.events.list({
      calendarId: options.calendarId ?? DEFAULT_CALENDAR_ID,
      timeMin: options.timeMin,
      timeMax: options.timeMax,
      maxResults: options.maxResults ?? 50,
      singleEvents: options.singleEvents ?? true,
      orderBy: options.orderBy ?? 'startTime',
    });

    return (res.data.items ?? []).map((e) => ({
      id: e.id ?? '',
      summary: e.summary ?? '',
      start: e.start?.dateTime ?? e.start?.date ?? '',
      end: e.end?.dateTime ?? e.end?.date ?? '',
      htmlLink: e.htmlLink ?? undefined,
      status: e.status ?? 'confirmed',
    })).filter((e) => e.id); // Filter out events without id
  } catch (err) {
    console.error(`[Calendar] Failed to list events: ${getErrorMessage(err)}`);
    return [];
  }
}

/** Get a single event. */
export async function calendarGet(
  auth: OAuth2Client,
  eventId: string,
  calendarId: string = DEFAULT_CALENDAR_ID
): Promise<CalendarEventResult | null> {
  if (!eventId) {
    console.warn('[Calendar] calendarGet called without eventId');
    return null;
  }

  try {
    const calendar = google.calendar({ version: 'v3', auth });
    const res = await calendar.events.get({ calendarId, eventId });
    const e = res.data;
    return {
      id: e.id ?? eventId,
      summary: e.summary ?? '',
      start: e.start?.dateTime ?? e.start?.date ?? '',
      end: e.end?.dateTime ?? e.end?.date ?? '',
      htmlLink: e.htmlLink ?? undefined,
      status: e.status ?? 'confirmed',
    };
  } catch (err) {
    console.error(`[Calendar] Failed to get event ${eventId}: ${getErrorMessage(err)}`);
    return null;
  }
}

/** Update an event. */
export async function calendarUpdate(
  auth: OAuth2Client,
  eventId: string,
  input: Partial<Pick<ScheduleMeetingInput, 'summary' | 'description' | 'start' | 'end' | 'attendees' | 'timeZone'>>,
  calendarId: string = DEFAULT_CALENDAR_ID
): Promise<{ success: boolean; event?: CalendarEventResult; error?: string }> {
  if (!eventId) {
    return { success: false, error: 'Event ID is required' };
  }

  // Validate datetime fields if provided
  if (input.start && !isValidDatetime(input.start)) {
    return { success: false, error: `Invalid start datetime: ${input.start}` };
  }
  if (input.end && !isValidDatetime(input.end)) {
    return { success: false, error: `Invalid end datetime: ${input.end}` };
  }

  try {
    const calendar = google.calendar({ version: 'v3', auth });
    const body: Record<string, unknown> = {};
    if (input.summary != null) body.summary = input.summary;
    if (input.description != null) body.description = input.description;
    if (input.start != null) body.start = { dateTime: input.start, timeZone: input.timeZone ?? 'UTC' };
    if (input.end != null) body.end = { dateTime: input.end, timeZone: input.timeZone ?? 'UTC' };
    if (input.attendees != null) body.attendees = input.attendees.map((email) => ({ email }));
    const res = await calendar.events.patch({ calendarId, eventId, requestBody: body });
    const e = res.data;
    return {
      success: true,
      event: {
        id: e.id ?? eventId,
        summary: e.summary ?? '',
        start: e.start?.dateTime ?? e.start?.date ?? '',
        end: e.end?.dateTime ?? e.end?.date ?? '',
        htmlLink: e.htmlLink ?? undefined,
        status: e.status ?? 'confirmed',
      },
    };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}
