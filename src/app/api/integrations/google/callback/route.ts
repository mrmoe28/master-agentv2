import { NextRequest, NextResponse } from "next/server";
import {
  createGoogleOAuth2Client,
  exchangeCodeForTokens,
} from "@/integrations/google/auth";
import { defaultTokenStore } from "@/integrations/token-store";

const DEFAULT_USER_ID = "default";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const baseUrl = request.nextUrl.origin;
  const redirectUrl = `${baseUrl}/integrations?connected=google`;

  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/integrations?error=google_denied`
    );
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/integrations?error=no_code`);
  }

  try {
    const oauth2 = createGoogleOAuth2Client();
    await exchangeCodeForTokens(
      oauth2,
      code,
      DEFAULT_USER_ID,
      defaultTokenStore
    );
    return NextResponse.redirect(redirectUrl);
  } catch {
    return NextResponse.redirect(`${baseUrl}/integrations?error=exchange_failed`);
  }
}
