/**
 * Google Drive: upload and download files.
 */

import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import type { UploadFileResult } from '../types.js';

export interface DriveUploadInput {
  name: string;
  mimeType: string;
  body: Buffer | NodeJS.ReadableStream;
  parentId?: string;
}

/** Upload a file to Google Drive. */
export async function driveUpload(
  auth: OAuth2Client,
  input: DriveUploadInput
): Promise<UploadFileResult> {
  try {
    const drive = google.drive({ version: 'v3', auth });
    const res = await drive.files.create({
      requestBody: {
        name: input.name,
        mimeType: input.mimeType,
        parents: input.parentId ? [input.parentId] : undefined,
      },
      media: {
        mimeType: input.mimeType,
        body: input.body,
      },
      fields: 'id, webViewLink',
    });
    return {
      success: true,
      fileId: res.data.id ?? undefined,
      webViewLink: res.data.webViewLink ?? undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

/** Download file content by ID. */
export async function driveDownload(
  auth: OAuth2Client,
  fileId: string
): Promise<{ success: boolean; data?: Buffer; mimeType?: string; error?: string }> {
  try {
    const drive = google.drive({ version: 'v3', auth });
    const meta = await drive.files.get({ fileId, fields: 'mimeType' });
    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    const data = Buffer.from(res.data as ArrayBuffer);
    return {
      success: true,
      data,
      mimeType: meta.data.mimeType ?? undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
