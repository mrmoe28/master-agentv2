/**
 * Google OAuth client with token storage and refresh handling.
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI.
 */

import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import type { ITokenStore } from '../types';
import type { StoredTokens } from '../types';
import { defaultTokenStore } from '../token-store';
import { getErrorMessage } from '@/utils/errors';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive',
];

export interface GoogleAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  tokenStore: ITokenStore;
}

function getEnvConfig(): GoogleAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return null;
  return {
    clientId,
    clientSecret,
    redirectUri,
    tokenStore: defaultTokenStore,
  };
}

/** Whether OAuth env vars are set (for UI to show setup vs connect). */
export function isGoogleOAuthConfigured(): boolean {
  return getEnvConfig() !== null;
}

/** Create OAuth2 client from env. */
export function createGoogleOAuth2Client(config?: GoogleAuthConfig | null): OAuth2Client {
  const c = config ?? getEnvConfig();
  if (!c) {
    throw new Error('Google OAuth config missing: set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI');
  }
  const oauth2 = new google.auth.OAuth2(c.clientId, c.clientSecret, c.redirectUri);
  return oauth2;
}

/** Generate URL for user to authorize (OAuth login). */
export function getGoogleAuthUrl(oauth2: OAuth2Client, state?: string): string {
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state: state ?? undefined,
  });
}

/** Exchange code for tokens and persist via tokenStore. */
export async function exchangeCodeForTokens(
  oauth2: OAuth2Client,
  code: string,
  userId: string,
  tokenStore: ITokenStore
): Promise<StoredTokens> {
  const { tokens } = await oauth2.getToken(code);

  // Handle potentially missing tokens gracefully
  if (!tokens.access_token) {
    throw new Error('No access token received from Google OAuth');
  }

  const stored: StoredTokens = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? undefined,
    expiry_date: tokens.expiry_date ?? undefined,
    scope: tokens.scope ?? undefined,
  };
  await tokenStore.set('google', userId, stored);
  oauth2.setCredentials(tokens);
  return stored;
}

/** Create an OAuth2 client with credentials loaded from token store; persists refreshed tokens. */
export async function getAuthenticatedGoogleClient(
  userId: string,
  config?: { tokenStore: ITokenStore; oauth2?: OAuth2Client } | null
): Promise<OAuth2Client> {
  const tokenStore = config?.tokenStore ?? defaultTokenStore;
  const oauth2 = config?.oauth2 ?? createGoogleOAuth2Client();
  const stored = await tokenStore.get('google', userId);
  if (!stored) {
    throw new Error(`No Google tokens for user ${userId}. Complete OAuth login first.`);
  }
  oauth2.setCredentials({
    access_token: stored.access_token,
    refresh_token: stored.refresh_token,
    expiry_date: stored.expiry_date,
    scope: stored.scope,
  });

  // Handle token refresh events with error handling
  oauth2.on('tokens', async (tokens) => {
    try {
      const next: StoredTokens = {
        access_token: tokens.access_token ?? stored.access_token,
        refresh_token: tokens.refresh_token ?? stored.refresh_token,
        expiry_date: tokens.expiry_date ?? stored.expiry_date,
        scope: tokens.scope ?? stored.scope,
      };
      await tokenStore.set('google', userId, next);
    } catch (err) {
      // Log error but don't throw - token refresh should not crash the application
      console.error(`[GoogleAuth] Failed to persist refreshed tokens for user ${userId}: ${getErrorMessage(err)}`);
    }
  });

  // Force refresh if token is expired so the first API call has a valid token
  try {
    await oauth2.getAccessToken();
  } catch (err) {
    throw new Error(
      `Google token invalid or expired. Reconnect Google in Integrations (use "Reconnect with Google") to grant access again. ${getErrorMessage(err)}`
    );
  }

  return oauth2;
}
