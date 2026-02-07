import { NextResponse } from "next/server";
import { listSkills } from "@/backend/skills";

export async function GET() {
  try {
    const skills = await listSkills();
    return NextResponse.json({ skills });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
