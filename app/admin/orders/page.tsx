"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { Order, OrderStatus } from "@/lib/types";

const statuses: Array<{ value: OrderStatus; label: string }> = [
  { value: "pending", label: "待确认" },
  { value: "confirmed", label: "已确认" },
  { value: "preparing", label: "制作中" },
  { value: "served", label: "已上菜" },
  { value: "paid", label: "已结账" },
  { value: "cancelled", label: "已取消" },
];

function formatPrice(price: number) {
  return `¥${price.toFixed(2)}`;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/orders", { cache: "no-store" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `Failed to load orders (${res.status})`);
      }

      const data = (await res.json()) as { orders: Order[] };
      setOrders(data.orders);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setLoading(false);
    });
  }, [load]);

  async function updateStatus(orderId: string, status: OrderStatus) {
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });

    const data = (await res.json().catch(() => null)) as { order?: Order; error?: string } | null;
    if (!res.ok) {
      throw new Error(data?.error ?? `Failed to update order (${res.status})`);
    }

    if (data?.order) {
      setOrders((prev) => prev.map((o) => (o.id === data.order?.id ? data.order : o)));
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-8 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold">订单管理</h1>
            <div className="text-sm text-zinc-600 dark:text-zinc-300">查看订单、更新状态</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                load().catch((err: unknown) => {
                  const message = err instanceof Error ? err.message : "Unknown error";
                  setError(message);
                });
              }}
              className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            >
              刷新
            </button>
            <Link href="/admin" className="text-sm text-zinc-600 underline dark:text-zinc-300">
              返回后台
            </Link>
          </div>
        </header>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-50">
            {error}
          </div>
        ) : null}

        <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <div className="text-base font-medium">订单列表</div>
            {loading ? <div className="text-sm text-zinc-500">加载中…</div> : null}
          </div>

          {orders.length === 0 ? (
            <div className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">暂无订单</div>
          ) : (
            <div className="mt-4 flex flex-col gap-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-col">
                      <div className="font-medium">
                        订单号 <span className="font-mono text-sm">{order.id}</span>
                      </div>
                      <div className="text-sm text-zinc-600 dark:text-zinc-300">
                        {new Date(order.createdAt).toLocaleString()} {order.table ? `· 桌号 ${order.table}` : ""}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium tabular-nums">{formatPrice(order.total)}</div>
                      <select
                        value={order.status}
                        onChange={(e) => {
                          const next = e.target.value as OrderStatus;
                          updateStatus(order.id, next).catch((err: unknown) => {
                            const message = err instanceof Error ? err.message : "Unknown error";
                            setError(message);
                          });
                        }}
                        className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                      >
                        {statuses.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-zinc-100 pt-3 text-sm dark:border-zinc-900">
                    <div className="flex flex-col gap-2">
                      {order.items.map((item) => (
                        <div key={`${order.id}-${item.menuItemId}`} className="flex justify-between gap-3">
                          <div className="flex-1">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-zinc-600 dark:text-zinc-300">
                              {formatPrice(item.price)} × {item.quantity}
                            </div>
                          </div>
                          <div className="tabular-nums">{formatPrice(item.price * item.quantity)}</div>
                        </div>
                      ))}
                    </div>

                    {order.note ? (
                      <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-300">备注：{order.note}</div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
