import { NextResponse } from "next/server";

import { StoreClosedError, createOrder, listOrders } from "@/lib/db";
import type { CreateOrderInput } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const orders = await listOrders();
  return NextResponse.json({ orders });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const order = await createOrder(body as CreateOrderInput);
    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = err instanceof StoreClosedError ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
