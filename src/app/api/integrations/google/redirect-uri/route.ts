import { NextResponse } from "next/server";

/**
 * Returns the redirect URI this app sends to Google (from GOOGLE_REDIRECT_URI).
 * Use this exact string in Google Cloud Console → Credentials → OAuth client → Authorized redirect URIs.
 */
export async function GET() {
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim() ?? "";
  return NextResponse.json({ redirectUri });
}
