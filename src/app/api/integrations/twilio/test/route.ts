import { NextResponse } from "next/server";
import Twilio from "twilio";
import { getEnv } from "@/lib/env";

export async function GET() {
  const sid = getEnv("TWILIO_ACCOUNT_SID");
  const token = getEnv("TWILIO_AUTH_TOKEN");
  if (!sid || !token) {
    return NextResponse.json(
      { connected: false, error: "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are not set" },
      { status: 200 }
    );
  }
  try {
    const client = Twilio(sid, token);
    await client.api.accounts(sid).fetch();
    return NextResponse.json({ connected: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { connected: false, error: message },
      { status: 200 }
    );
  }
}
