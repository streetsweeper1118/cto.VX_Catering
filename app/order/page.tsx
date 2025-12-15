"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { MenuResponse } from "@/lib/db";
import type { MenuItem } from "@/lib/types";

type Cart = Record<string, number>;

type Toast = {
  type: "success" | "error" | "info";
  title: string;
  description?: string;
};

function formatPrice(price: number) {
  return `¥${price.toFixed(2)}`;
}

function matchQuery(item: MenuItem, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    item.name.toLowerCase().includes(q) ||
    (item.description ? item.description.toLowerCase().includes(q) : false)
  );
}

export default function OrderPage() {
  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [cart, setCart] = useState<Cart>({});
  const [table, setTable] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
  const [query, setQuery] = useState("");

  const [toast, setToast] = useState<Toast | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
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
        setToast({ type: "error", title: "加载失败", description: message });
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

  const cartCount = useMemo(() => {
    return cartLines.reduce((sum, l) => sum + l.quantity, 0);
  }, [cartLines]);

  const total = useMemo(() => {
    return cartLines.reduce((sum, l) => sum + l.item.price * l.quantity, 0);
  }, [cartLines]);

  const filteredCategories = useMemo(() => {
    const categories = menu?.categories ?? [];

    return categories
      .filter((c) => activeCategoryId === "all" || c.id === activeCategoryId)
      .map((c) => ({
        ...c,
        items: c.items.filter((i) => matchQuery(i, query)),
      }))
      .filter((c) => (query.trim() ? c.items.length > 0 : true));
  }, [activeCategoryId, menu, query]);

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

  function clearCart() {
    setCart({});
  }

  async function submitOrder() {
    setSubmitting(true);

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

      const orderId = data?.order?.id ?? null;
      setCreatedOrderId(orderId);
      clearCart();
      setTable("");
      setNote("");

      setToast({
        type: "success",
        title: "订单已提交",
        description: orderId ? `订单号：${orderId}` : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(85%_65%_at_10%_0%,rgba(16,185,129,0.18),transparent_55%),radial-gradient(70%_55%_at_90%_10%,rgba(56,189,248,0.14),transparent_55%)] px-6 py-8 text-zinc-900 dark:bg-[radial-gradient(85%_65%_at_10%_0%,rgba(16,185,129,0.12),transparent_55%),radial-gradient(70%_55%_at_90%_10%,rgba(56,189,248,0.10),transparent_55%)] dark:text-zinc-50">
      {toast ? (
        <div className="fixed inset-x-0 top-5 z-50 px-4">
          <div
            className={`mx-auto flex w-full max-w-md items-start justify-between gap-4 rounded-2xl border p-4 shadow-lg backdrop-blur transition dark:shadow-black/40 ${
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
                <h1 className="text-xl font-semibold tracking-tight">顾客点单端</h1>
                <div className="text-sm text-zinc-600 dark:text-zinc-300">
                  搜索菜品 · 加入购物车 · 一键下单
                </div>
              </div>
            </div>

            <Link
              href="/"
              className="rounded-full border border-zinc-200 bg-white/70 px-4 py-2 text-sm text-zinc-700 shadow-sm backdrop-blur transition hover:bg-white dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-200 dark:hover:bg-zinc-950"
            >
              返回
            </Link>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
            <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/50">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">菜单</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {menu ? `${menu.categories.reduce((n, c) => n + c.items.length, 0)} 道菜` : "加载中…"}
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm shadow-sm outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-200/40 dark:border-zinc-800 dark:bg-black/30 dark:focus:border-emerald-700 dark:focus:ring-emerald-900/40"
                      placeholder="搜索：宫保鸡丁 / 可乐 …"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveCategoryId("all")}
                      className={`rounded-full px-3 py-1 text-xs shadow-sm transition ${
                        activeCategoryId === "all"
                          ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                          : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black/30 dark:text-zinc-200 dark:hover:bg-zinc-900"
                      }`}
                    >
                      全部
                    </button>
                    {(menu?.categories ?? []).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setActiveCategoryId(c.id)}
                        className={`rounded-full px-3 py-1 text-xs shadow-sm transition ${
                          activeCategoryId === c.id
                            ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                            : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black/30 dark:text-zinc-200 dark:hover:bg-zinc-900"
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <aside className="lg:sticky lg:top-6">
              <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/50">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">购物车</div>
                  <div className="flex items-center gap-3">
                    <div className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-black/30 dark:text-zinc-200">
                      {cartCount} 件
                    </div>
                    <button
                      type="button"
                      onClick={clearCart}
                      disabled={cartCount === 0}
                      className="text-xs text-zinc-500 underline underline-offset-4 transition hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:text-zinc-50"
                    >
                      清空
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex max-h-64 flex-col gap-2 overflow-auto pr-1">
                  {cartLines.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                      还没有选择菜品
                    </div>
                  ) : (
                    cartLines.map((l) => (
                      <div
                        key={l.item.id}
                        className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200/70 bg-white/70 p-3 dark:border-zinc-800/70 dark:bg-black/20"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium">{l.item.name}</div>
                          <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                            {formatPrice(l.item.price)} × {l.quantity}
                          </div>
                        </div>
                        <div className="text-sm font-semibold tabular-nums">{formatPrice(l.item.price * l.quantity)}</div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <div>合计</div>
                    <div className="tabular-nums">{formatPrice(total)}</div>
                  </div>

                  <div className="mt-3 grid gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-zinc-600 dark:text-zinc-300">桌号（可选）</span>
                      <input
                        value={table}
                        onChange={(e) => setTable(e.target.value)}
                        className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-200/40 dark:border-zinc-800 dark:bg-black/30 dark:focus:border-emerald-700 dark:focus:ring-emerald-900/40"
                        placeholder="例如：A12"
                      />
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-zinc-600 dark:text-zinc-300">备注（可选）</span>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="min-h-20 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-200/40 dark:border-zinc-800 dark:bg-black/30 dark:focus:border-emerald-700 dark:focus:ring-emerald-900/40"
                        placeholder="少辣、不要香菜…"
                      />
                    </label>

                    <button
                      type="button"
                      disabled={submitting || cartLines.length === 0}
                      onClick={() => {
                        submitOrder().catch((err: unknown) => {
                          const message = err instanceof Error ? err.message : "Unknown error";
                          setToast({ type: "error", title: "下单失败", description: message });
                        });
                      }}
                      className="group relative w-full overflow-hidden rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      <span className="relative">{submitting ? "提交中…" : "提交订单"}</span>
                    </button>

                    {createdOrderId ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-50">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium">已提交</div>
                          <button
                            type="button"
                            onClick={() => {
                              if (!createdOrderId) return;
                              navigator.clipboard
                                .writeText(createdOrderId)
                                .then(() => setToast({ type: "success", title: "已复制订单号" }))
                                .catch(() => setToast({ type: "error", title: "复制失败" }));
                            }}
                            className="rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs text-emerald-900 shadow-sm hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-50"
                          >
                            复制
                          </button>
                        </div>
                        <div className="mt-1 font-mono opacity-90">{createdOrderId}</div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-5">
            {!menu ? (
              <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-6 text-sm text-zinc-600 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/50 dark:text-zinc-300">
                正在加载菜单…
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-6 text-sm text-zinc-600 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/50 dark:text-zinc-300">
                没有匹配的菜品
              </div>
            ) : (
              filteredCategories.map((category) => (
                <div
                  key={category.id}
                  className="rounded-2xl border border-zinc-200/70 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/50"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="text-base font-semibold tracking-tight">{category.name}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">{category.items.length} 道</div>
                  </div>

                  <div className="grid gap-3">
                    {category.items.map((item) => {
                      const qty = cart[item.id] ?? 0;
                      return (
                        <div
                          key={item.id}
                          className="group flex items-start justify-between gap-4 rounded-2xl border border-zinc-200/70 bg-white/70 p-4 transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800/70 dark:bg-black/20 dark:hover:border-zinc-700"
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-semibold">{item.name}</div>
                              {qty ? (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-50">
                                  已选 {qty}
                                </span>
                              ) : null}
                            </div>
                            {item.description ? (
                              <div className="text-xs text-zinc-600 dark:text-zinc-300">{item.description}</div>
                            ) : null}
                            <div className="mt-1 text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                              {formatPrice(item.price)}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => decFromCart(item.id)}
                              disabled={!qty}
                              className="grid h-9 w-9 place-items-center rounded-xl border border-zinc-200 bg-white text-sm text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:bg-black/30 dark:text-zinc-200 dark:hover:bg-zinc-900"
                            >
                              −
                            </button>
                            <div className="w-8 text-center text-sm font-semibold tabular-nums">{qty || 0}</div>
                            <button
                              type="button"
                              onClick={() => addToCart(item.id)}
                              className="grid h-9 w-9 place-items-center rounded-xl bg-zinc-900 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 active:scale-[0.98] dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden lg:block" />
        </section>
      </main>
    </div>
  );
}
