import { NextResponse } from "next/server";
import { defaultTokenStore } from "@/integrations/token-store";
import { isGoogleOAuthConfigured } from "@/integrations/google/auth";
import { getEnv } from "@/lib/env";

const DEFAULT_USER_ID = "default";

export async function GET() {
  try {
    const googleTokens = await defaultTokenStore.get("google", DEFAULT_USER_ID);
    const google = !!googleTokens?.access_token;
    const googleConfigMissing = !isGoogleOAuthConfigured();
    const twilio =
      !!getEnv("TWILIO_ACCOUNT_SID") &&
      !!getEnv("TWILIO_AUTH_TOKEN") &&
      !!getEnv("TWILIO_PHONE_NUMBER");
    const sendgrid = !!getEnv("SENDGRID_API_KEY");

    return NextResponse.json({
      google,
      googleConfigMissing,
      twilio,
      sendgrid,
    });
  } catch {
    return NextResponse.json(
      { google: false, googleConfigMissing: true, twilio: false, sendgrid: false },
      { status: 200 }
    );
  }
}
