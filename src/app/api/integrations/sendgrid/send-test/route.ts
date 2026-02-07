import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { sendgridSend } from "@/integrations/sendgrid/client";

export async function POST(request: Request) {
  const key = getEnv("SENDGRID_API_KEY");
  if (!key) {
    return NextResponse.json(
      { success: false, error: "SENDGRID_API_KEY is not set" },
      { status: 400 }
    );
  }
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
  const from = {
    email: getEnv("MAIL_FROM_EMAIL") || "noreply@example.com",
    name: getEnv("MAIL_FROM_NAME") || "Master Agent",
  };
  try {
    const result = await sendgridSend({
      to,
      from,
      subject: "Master Agent – test email",
      text: "This is a test email from your Master Agent app. If you received this, email sending is working.",
    });
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error ?? "Send failed" },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, message: "Email sent" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
