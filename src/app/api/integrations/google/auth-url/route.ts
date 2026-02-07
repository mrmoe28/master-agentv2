import { NextResponse } from "next/server";
import {
  createGoogleOAuth2Client,
  getGoogleAuthUrl,
} from "@/integrations/google/auth";
import { randomBytes } from "crypto";

export async function GET() {
  try {
    const oauth2 = createGoogleOAuth2Client();
    const state = randomBytes(16).toString("hex");
    const url = getGoogleAuthUrl(oauth2, state);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
