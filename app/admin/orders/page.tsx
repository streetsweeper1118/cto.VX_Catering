"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { Order, OrderStatus } from "@/lib/types";

type Toast = {
  type: "success" | "error" | "info";
  title: string;
  description?: string;
};

const statusMeta: Record<OrderStatus, { label: string; badge: string }> = {
  pending: {
    label: "待确认",
    badge: "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-50",
  },
  confirmed: {
    label: "已确认",
    badge: "bg-sky-100 text-sky-900 dark:bg-sky-950/40 dark:text-sky-50",
  },
  preparing: {
    label: "制作中",
    badge: "bg-indigo-100 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-50",
  },
  served: {
    label: "已上菜",
    badge: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-50",
  },
  paid: {
    label: "已结账",
    badge: "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50",
  },
  cancelled: {
    label: "已取消",
    badge: "bg-rose-100 text-rose-900 dark:bg-rose-950/40 dark:text-rose-50",
  },
};

const statuses: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "served",
  "paid",
  "cancelled",
];

function formatPrice(price: number) {
  return `¥${price.toFixed(2)}`;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      load().catch(() => undefined);
    }, 5000);

    return () => clearInterval(timer);
  }, [autoRefresh, load]);

  const summary = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === "pending").length;
    return { total, pending };
  }, [orders]);

  async function updateStatus(orderId: string, status: OrderStatus) {
    setUpdatingOrderId(orderId);

    try {
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
        setToast({
          type: "success",
          title: "状态已更新",
          description: `${data.order.id.slice(0, 8)}… → ${statusMeta[data.order.status].label}`,
        });
      }
    } finally {
      setUpdatingOrderId(null);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(80%_60%_at_10%_0%,rgba(16,185,129,0.16),transparent_55%),radial-gradient(70%_55%_at_90%_10%,rgba(99,102,241,0.14),transparent_55%)] px-6 py-8 text-zinc-900 dark:bg-[radial-gradient(80%_60%_at_10%_0%,rgba(16,185,129,0.11),transparent_55%),radial-gradient(70%_55%_at_90%_10%,rgba(99,102,241,0.10),transparent_55%)] dark:text-zinc-50">
      {toast ? (
        <div className="fixed inset-x-0 top-5 z-50 px-4">
          <div
            className={`mx-auto flex w-full max-w-md items-start justify-between gap-4 rounded-2xl border p-4 shadow-lg backdrop-blur dark:shadow-black/40 ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50/90 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/50 dark:text-emerald-50"
                : toast.type === "error"
                  ? "border-red-200 bg-red-50/90 text-red-900 dark:border-red-900/40 dark:bg-red-950/50 dark:text-red-50"
                  : "border-zinc-200 bg-white/90 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-50"
            }`}
          >
            <div className="flex flex-col gap-1">
              <div className="text-sm font-semibold">{toast.title}</div>
              {toast.description ? <div className="text-xs opacity-90">{toast.description}</div> : null}
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="rounded-lg px-2 py-1 text-sm opacity-70 transition hover:opacity-100"
              aria-label="close"
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-zinc-900 text-white shadow-sm dark:bg-zinc-50 dark:text-zinc-900">
                <span className="text-sm font-semibold">单</span>
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-semibold tracking-tight">订单管理</h1>
                <div className="text-sm text-zinc-600 dark:text-zinc-300">
                  实时刷新 · 展开查看明细 · 状态流转
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  load().catch((err: unknown) => {
                    const message = err instanceof Error ? err.message : "Unknown error";
                    setToast({ type: "error", title: "刷新失败", description: message });
                  });
                }}
                className="rounded-full border border-zinc-200 bg-white/70 px-4 py-2 text-sm text-zinc-700 shadow-sm backdrop-blur transition hover:bg-white dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-200 dark:hover:bg-zinc-950"
              >
                刷新
              </button>
              <Link href="/admin" className="text-sm text-zinc-700 underline underline-offset-4 dark:text-zinc-200">
                返回后台
              </Link>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
            <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-4 text-sm shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/50">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900">
                    {summary.total} 单
                  </span>
                  <span className="text-xs text-zinc-600 dark:text-zinc-300">待确认：{summary.pending}</span>
                  {loading ? <span className="text-xs text-zinc-500">加载中…</span> : null}
                </div>

                <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-emerald-600"
                  />
                  自动刷新（5s）
                </label>
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4 text-sm text-red-900 shadow-sm backdrop-blur dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-50">
                {error}
              </div>
            ) : null}
          </div>
        </header>

        <section className="flex flex-col gap-4">
          {orders.length === 0 && !loading ? (
            <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-6 text-sm text-zinc-600 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/50 dark:text-zinc-300">
              暂无订单
            </div>
          ) : (
            orders.map((order) => (
              <details
                key={order.id}
                className="group rounded-2xl border border-zinc-200/70 bg-white/70 shadow-sm backdrop-blur transition hover:shadow-md dark:border-zinc-800/70 dark:bg-zinc-950/50"
              >
                <summary className="cursor-pointer list-none px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">订单</span>
                        <span className="font-mono text-xs text-zinc-600 dark:text-zinc-300">
                          {order.id}
                        </span>
                        {order.table ? (
                          <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-black/30 dark:text-zinc-200">
                            桌号 {order.table}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {new Date(order.createdAt).toLocaleString()} · {order.items.length} 项
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta[order.status].badge}`}
                      >
                        {statusMeta[order.status].label}
                      </span>
                      <div className="text-sm font-semibold tabular-nums">{formatPrice(order.total)}</div>
                      <span className="text-sm text-zinc-400 transition group-open:rotate-180">▾</span>
                    </div>
                  </div>
                </summary>

                <div className="border-t border-zinc-200/70 px-5 py-4 dark:border-zinc-800/70">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold">状态</div>
                        <select
                          value={order.status}
                          disabled={updatingOrderId === order.id}
                          onChange={(e) => {
                            const next = e.target.value as OrderStatus;
                            updateStatus(order.id, next).catch((err: unknown) => {
                              const message = err instanceof Error ? err.message : "Unknown error";
                              setToast({ type: "error", title: "更新失败", description: message });
                            });
                          }}
                          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-200/40 disabled:opacity-50 dark:border-zinc-800 dark:bg-black/30 dark:focus:border-emerald-700 dark:focus:ring-emerald-900/40"
                        >
                          {statuses.map((s) => (
                            <option key={s} value={s}>
                              {statusMeta[s].label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard
                            .writeText(order.id)
                            .then(() => setToast({ type: "success", title: "已复制订单号" }))
                            .catch(() => setToast({ type: "error", title: "复制失败" }));
                        }}
                        className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black/30 dark:hover:bg-zinc-900"
                      >
                        复制订单号
                      </button>
                    </div>

                    <div className="grid gap-2">
                      {order.items.map((item) => (
                        <div
                          key={`${order.id}-${item.menuItemId}`}
                          className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200/70 bg-white/70 p-3 dark:border-zinc-800/70 dark:bg-black/20"
                        >
                          <div className="flex-1">
                            <div className="text-sm font-semibold">{item.name}</div>
                            <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                              {formatPrice(item.price)} × {item.quantity}
                            </div>
                          </div>
                          <div className="text-sm font-semibold tabular-nums">{formatPrice(item.price * item.quantity)}</div>
                        </div>
                      ))}
                    </div>

                    {order.note ? (
                      <div className="rounded-xl border border-zinc-200/70 bg-white/70 p-3 text-xs text-zinc-700 dark:border-zinc-800/70 dark:bg-black/20 dark:text-zinc-200">
                        <span className="font-semibold">备注：</span>
                        {order.note}
                      </div>
                    ) : null}
                  </div>
                </div>
              </details>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
