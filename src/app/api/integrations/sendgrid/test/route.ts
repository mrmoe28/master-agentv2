import { NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";
import { getEnv } from "@/lib/env";

export async function GET() {
  const key = getEnv("SENDGRID_API_KEY");
  if (!key) {
    return NextResponse.json(
      { connected: false, error: "SENDGRID_API_KEY is not set" },
      { status: 200 }
    );
  }
  try {
    sgMail.setApiKey(key);
    return NextResponse.json({ connected: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { connected: false, error: message },
      { status: 200 }
    );
  }
}
