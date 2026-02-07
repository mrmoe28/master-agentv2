import { NextResponse } from "next/server";
import { getAuthenticatedGoogleClient } from "@/integrations/google/auth";
import { gmailSend } from "@/integrations/google/gmail";
import { defaultTokenStore } from "@/integrations/token-store";

const DEFAULT_USER_ID = "default";

export async function POST(request: Request) {
  let body: { to?: string };
  try {
    body = (await request.json()) as { to?: string };
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }
  const to = typeof body.to === "string" ? body.to.trim() : "";
  if (!to) {
    return NextResponse.json(
      { success: false, error: "Body must include 'to' (email address)" },
      { status: 400 }
    );
  }
  try {
    const auth = await getAuthenticatedGoogleClient(DEFAULT_USER_ID, {
      tokenStore: defaultTokenStore,
    });
    const result = await gmailSend(auth, {
      to,
      subject: "Master Agent – test email (Gmail)",
      body: "This test email was sent via your connected Gmail account. If you received this, Google sending is working.",
    });
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error ?? "Send failed" },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, message: "Email sent via Gmail" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
