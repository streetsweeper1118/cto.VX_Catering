import { NextResponse } from "next/server";

import { getStoreStatus } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const store = await getStoreStatus();
  return NextResponse.json({ store });
}
