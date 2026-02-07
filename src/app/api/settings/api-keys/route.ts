import { NextResponse } from "next/server";
import {
  getStoredKeysStatus,
  setKeys,
} from "@/lib/api-keys-store";

const API_KEY_NAMES = [
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "OLLAMA_HOST",
  "SENDGRID_API_KEY",
  "MAIL_FROM_EMAIL",
  "MAIL_FROM_NAME",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_PHONE_NUMBER",
  "GOOGLE_API_KEY",
  "GOOGLE_CUSTOM_SEARCH_ENGINE_ID",
  "SERPER_API_KEY",
] as const;

export async function GET() {
  try {
    const status = getStoredKeysStatus([...API_KEY_NAMES]);
    return NextResponse.json({ keys: status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        { error: "Body must be an object" },
        { status: 400 }
      );
    }
    const allowed = new Set(API_KEY_NAMES);
    const toSet: Record<string, string> = {};
    for (const [key, value] of Object.entries(body)) {
      if (!allowed.has(key as (typeof API_KEY_NAMES)[number])) continue;
      if (value === null || value === undefined) continue;
      toSet[key] = String(value).trim();
    }
    setKeys(toSet);
    const status = getStoredKeysStatus([...API_KEY_NAMES]);
    return NextResponse.json({ keys: status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
