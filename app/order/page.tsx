"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { MenuResponse } from "@/lib/db";
import type { MenuItem } from "@/lib/types";

type Cart = Record<string, number>;

function formatPrice(price: number) {
  return `¥${price.toFixed(2)}`;
}

export default function OrderPage() {
  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<Cart>({});
  const [table, setTable] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      const res = await fetch("/api/menu", { cache: "no-store" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `Failed to load menu (${res.status})`);
      }

      const data = (await res.json()) as MenuResponse;
      if (!cancelled) {
        setMenu(data);
      }
    }

    load().catch((err: unknown) => {
      if (!cancelled) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const itemMap = useMemo(() => {
    const map = new Map<string, MenuItem>();
    for (const cat of menu?.categories ?? []) {
      for (const item of cat.items) {
        map.set(item.id, item);
      }
    }
    return map;
  }, [menu]);

  const cartLines = useMemo(() => {
    return Object.entries(cart)
      .map(([id, quantity]) => ({ item: itemMap.get(id), quantity }))
      .filter((l): l is { item: MenuItem; quantity: number } => Boolean(l.item) && l.quantity > 0);
  }, [cart, itemMap]);

  const total = useMemo(() => {
    return cartLines.reduce((sum, l) => sum + l.item.price * l.quantity, 0);
  }, [cartLines]);

  function addToCart(itemId: string) {
    setCart((c) => ({ ...c, [itemId]: (c[itemId] ?? 0) + 1 }));
  }

  function decFromCart(itemId: string) {
    setCart((c) => {
      const nextQty = (c[itemId] ?? 0) - 1;
      const next = { ...c };
      if (nextQty <= 0) {
        delete next[itemId];
        return next;
      }
      next[itemId] = nextQty;
      return next;
    });
  }

  async function submitOrder() {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          table,
          note,
          items: cartLines.map((l) => ({ menuItemId: l.item.id, quantity: l.quantity })),
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | { order?: { id: string }; error?: string }
        | null;

      if (!res.ok) {
        throw new Error(data?.error ?? `Failed to create order (${res.status})`);
      }

      setCreatedOrderId(data?.order?.id ?? null);
      setCart({});
      setTable("");
      setNote("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-8 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">顾客点单端</h1>
            <Link href="/" className="text-sm text-zinc-600 underline dark:text-zinc-300">
              返回首页
            </Link>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            选择菜品加入购物车，然后提交订单。
          </p>
        </header>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-50">
            {error}
          </div>
        ) : null}

        {createdOrderId ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-50">
            订单已提交，订单号：<span className="font-mono">{createdOrderId}</span>
          </div>
        ) : null}

        <section className="grid gap-6 md:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-4">
            {!menu ? (
              <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                正在加载菜单…
              </div>
            ) : (
              menu.categories.map((category) => (
                <div
                  key={category.id}
                  className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="mb-3 text-base font-medium">{category.name}</div>
                  <div className="flex flex-col gap-3">
                    {category.items.length === 0 ? (
                      <div className="text-sm text-zinc-500 dark:text-zinc-400">暂无可售菜品</div>
                    ) : (
                      category.items.map((item) => (
                        <div key={item.id} className="flex items-start justify-between gap-4">
                          <div className="flex flex-col">
                            <div className="font-medium">{item.name}</div>
                            {item.description ? (
                              <div className="text-sm text-zinc-600 dark:text-zinc-300">
                                {item.description}
                              </div>
                            ) : null}
                            <div className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">
                              {formatPrice(item.price)}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {cart[item.id] ? (
                              <button
                                type="button"
                                className="rounded border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                                onClick={() => decFromCart(item.id)}
                              >
                                -
                              </button>
                            ) : null}
                            {cart[item.id] ? (
                              <div className="w-6 text-center text-sm tabular-nums">{cart[item.id]}</div>
                            ) : null}
                            <button
                              type="button"
                              className="rounded bg-zinc-900 px-3 py-1 text-sm text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                              onClick={() => addToCart(item.id)}
                            >
                              加入
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <aside className="h-fit rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-base font-medium">购物车</div>

            <div className="mt-3 flex flex-col gap-2">
              {cartLines.length === 0 ? (
                <div className="text-sm text-zinc-500 dark:text-zinc-400">还没有选择菜品</div>
              ) : (
                cartLines.map((l) => (
                  <div key={l.item.id} className="flex items-start justify-between gap-2 text-sm">
                    <div className="flex-1">
                      <div className="font-medium">{l.item.name}</div>
                      <div className="text-zinc-600 dark:text-zinc-300">
                        {formatPrice(l.item.price)} × {l.quantity}
                      </div>
                    </div>
                    <div className="tabular-nums">{formatPrice(l.item.price * l.quantity)}</div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 border-t border-zinc-200 pt-3 text-sm dark:border-zinc-800">
              <div className="flex items-center justify-between font-medium">
                <div>合计</div>
                <div className="tabular-nums">{formatPrice(total)}</div>
              </div>

              <label className="mt-3 flex flex-col gap-1">
                <span className="text-xs text-zinc-600 dark:text-zinc-300">桌号（可选）</span>
                <input
                  value={table}
                  onChange={(e) => setTable(e.target.value)}
                  className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                  placeholder="例如：A12"
                />
              </label>

              <label className="mt-3 flex flex-col gap-1">
                <span className="text-xs text-zinc-600 dark:text-zinc-300">备注（可选）</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="min-h-20 rounded border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                  placeholder="少辣、不要香菜…"
                />
              </label>

              <button
                type="button"
                disabled={submitting || cartLines.length === 0}
                onClick={() => {
                  submitOrder().catch((err: unknown) => {
                    const message = err instanceof Error ? err.message : "Unknown error";
                    setError(message);
                  });
                }}
                className="mt-4 w-full rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-300 dark:disabled:bg-emerald-900"
              >
                {submitting ? "提交中…" : "提交订单"}
              </button>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
