import { NextResponse } from "next/server";

import { getStoreSettings, updateStoreSettings } from "@/lib/db";
import type { UpdateStoreSettingsInput } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const store = await getStoreSettings();
  return NextResponse.json({ store });
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const store = await updateStoreSettings(body as UpdateStoreSettingsInput);
    return NextResponse.json({ store });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
