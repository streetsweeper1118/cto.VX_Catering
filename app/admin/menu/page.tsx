"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { MenuCategory, MenuItem } from "@/lib/types";

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

export default function AdminMenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const [query, setQuery] = useState("");
  const [categoryFilterId, setCategoryFilterId] = useState<string>("all");

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("28");
  const [newItemCategoryId, setNewItemCategoryId] = useState<string>("");
  const [newItemDescription, setNewItemDescription] = useState("");

  const [savingItemId, setSavingItemId] = useState<string | null>(null);

  const categoryNameById = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c.name] as const));
  }, [categories]);

  const itemCountByCategoryId = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      map.set(item.categoryId, (map.get(item.categoryId) ?? 0) + 1);
    }
    return map;
  }, [items]);

  const filteredItems = useMemo(() => {
    return items
      .filter((i) => (categoryFilterId === "all" ? true : i.categoryId === categoryFilterId))
      .filter((i) => matchQuery(i, query));
  }, [categoryFilterId, items, query]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [catRes, itemRes] = await Promise.all([
        fetch("/api/admin/menu/categories", { cache: "no-store" }),
        fetch("/api/admin/menu/items", { cache: "no-store" }),
      ]);

      if (!catRes.ok) {
        const data = (await catRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `Failed to load categories (${catRes.status})`);
      }
      if (!itemRes.ok) {
        const data = (await itemRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `Failed to load items (${itemRes.status})`);
      }

      const catData = (await catRes.json()) as { categories: MenuCategory[] };
      const itemData = (await itemRes.json()) as { items: MenuItem[] };

      setCategories(catData.categories);
      setItems(itemData.items);

      if (!newItemCategoryId && catData.categories[0]) {
        setNewItemCategoryId(catData.categories[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [newItemCategoryId]);

  useEffect(() => {
    load().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setLoading(false);
    });
  }, [load]);

  async function createCategory() {
    const name = newCategoryName.trim();
    if (!name) {
      setToast({ type: "error", title: "分类名称不能为空" });
      return;
    }

    const res = await fetch("/api/admin/menu/categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });

    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      throw new Error(data?.error ?? `Failed to create category (${res.status})`);
    }

    setNewCategoryName("");
    setToast({ type: "success", title: "分类已添加" });
    await load();
  }

  async function createItem() {
    const name = newItemName.trim();
    if (!name) {
      setToast({ type: "error", title: "菜品名称不能为空" });
      return;
    }

    const price = Number(newItemPrice);
    if (!Number.isFinite(price) || price < 0) {
      setToast({ type: "error", title: "价格必须是非负数字" });
      return;
    }

    const res = await fetch("/api/admin/menu/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        categoryId: newItemCategoryId,
        name,
        price,
        description: newItemDescription.trim() || undefined,
        isAvailable: true,
      }),
    });

    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      throw new Error(data?.error ?? `Failed to create item (${res.status})`);
    }

    setNewItemName("");
    setNewItemPrice("28");
    setNewItemDescription("");
    setToast({ type: "success", title: "菜品已添加" });
    await load();
  }

  async function toggleAvailable(item: MenuItem) {
    setSavingItemId(item.id);

    try {
      const res = await fetch(`/api/admin/menu/items/${item.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isAvailable: !item.isAvailable }),
      });

      const data = (await res.json().catch(() => null)) as { error?: string; item?: MenuItem } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? `Failed to update item (${res.status})`);
      }

      if (data?.item) {
        setItems((prev) => prev.map((i) => (i.id === data.item?.id ? data.item : i)));
        setToast({
          type: "success",
          title: data.item.isAvailable ? "已上架" : "已下架",
          description: data.item.name,
        });
      }
    } finally {
      setSavingItemId(null);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(80%_60%_at_10%_0%,rgba(99,102,241,0.15),transparent_55%),radial-gradient(70%_55%_at_90%_10%,rgba(16,185,129,0.14),transparent_55%)] px-6 py-8 text-zinc-900 dark:bg-[radial-gradient(80%_60%_at_10%_0%,rgba(99,102,241,0.10),transparent_55%),radial-gradient(70%_55%_at_90%_10%,rgba(16,185,129,0.10),transparent_55%)] dark:text-zinc-50">
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
                <span className="text-sm font-semibold">菜</span>
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-semibold tracking-tight">菜单管理</h1>
                <div className="text-sm text-zinc-600 dark:text-zinc-300">新增分类/菜品 · 上下架 · 搜索筛选</div>
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

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4 text-sm text-red-900 shadow-sm backdrop-blur dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-50">
              {error}
            </div>
          ) : null}
        </header>

        <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <aside className="flex flex-col gap-4">
            <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/50">
              <div className="text-sm font-semibold">分类</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCategoryFilterId("all")}
                  className={`rounded-full px-3 py-1 text-xs shadow-sm transition ${
                    categoryFilterId === "all"
                      ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                      : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black/30 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  }`}
                >
                  全部
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryFilterId(c.id)}
                    className={`rounded-full px-3 py-1 text-xs shadow-sm transition ${
                      categoryFilterId === c.id
                        ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                        : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black/30 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    }`}
                  >
                    {c.name}
                    <span className="ml-1 opacity-70">({itemCountByCategoryId.get(c.id) ?? 0})</span>
                  </button>
                ))}
              </div>

              <div className="mt-4">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">搜索</div>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm shadow-sm outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-200/40 dark:border-zinc-800 dark:bg-black/30 dark:focus:border-emerald-700 dark:focus:ring-emerald-900/40"
                  placeholder="搜索菜品…"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/50">
              <details open>
                <summary className="cursor-pointer select-none text-sm font-semibold">新增分类</summary>
                <div className="mt-3 flex gap-2">
                  <input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-200/40 dark:border-zinc-800 dark:bg-black/30 dark:focus:border-emerald-700 dark:focus:ring-emerald-900/40"
                    placeholder="例如：主食"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      createCategory().catch((err: unknown) => {
                        const message = err instanceof Error ? err.message : "Unknown error";
                        setToast({ type: "error", title: "添加失败", description: message });
                      });
                    }}
                    className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    添加
                  </button>
                </div>
              </details>
            </div>

            <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/50">
              <details open>
                <summary className="cursor-pointer select-none text-sm font-semibold">新增菜品</summary>

                <div className="mt-3 grid gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-zinc-600 dark:text-zinc-300">分类</span>
                    <select
                      value={newItemCategoryId}
                      onChange={(e) => setNewItemCategoryId(e.target.value)}
                      className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-200/40 dark:border-zinc-800 dark:bg-black/30 dark:focus:border-emerald-700 dark:focus:ring-emerald-900/40"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-zinc-600 dark:text-zinc-300">名称</span>
                    <input
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-200/40 dark:border-zinc-800 dark:bg-black/30 dark:focus:border-emerald-700 dark:focus:ring-emerald-900/40"
                      placeholder="例如：番茄炒蛋"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-zinc-600 dark:text-zinc-300">价格</span>
                    <input
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-200/40 dark:border-zinc-800 dark:bg-black/30 dark:focus:border-emerald-700 dark:focus:ring-emerald-900/40"
                      placeholder="例如：18"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-zinc-600 dark:text-zinc-300">描述（可选）</span>
                    <input
                      value={newItemDescription}
                      onChange={(e) => setNewItemDescription(e.target.value)}
                      className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-200/40 dark:border-zinc-800 dark:bg-black/30 dark:focus:border-emerald-700 dark:focus:ring-emerald-900/40"
                      placeholder="例如：招牌菜"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      createItem().catch((err: unknown) => {
                        const message = err instanceof Error ? err.message : "Unknown error";
                        setToast({ type: "error", title: "添加失败", description: message });
                      });
                    }}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
                  >
                    添加菜品
                  </button>
                </div>
              </details>
            </div>
          </aside>

          <section className="rounded-2xl border border-zinc-200/70 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/50">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">菜品列表</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {loading ? "加载中…" : `${filteredItems.length} 条`}
              </div>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="text-xs text-zinc-600 dark:text-zinc-300">
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="py-3 pr-3">名称</th>
                    <th className="py-3 pr-3">分类</th>
                    <th className="py-3 pr-3">价格</th>
                    <th className="py-3 pr-3">状态</th>
                    <th className="py-3 pr-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td className="py-8 text-sm text-zinc-500 dark:text-zinc-400" colSpan={5}>
                        暂无数据
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.id} className="border-b border-zinc-100 dark:border-zinc-900">
                        <td className="py-3 pr-3">
                          <div className="font-semibold">{item.name}</div>
                          {item.description ? (
                            <div className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-300">{item.description}</div>
                          ) : null}
                        </td>
                        <td className="py-3 pr-3 text-zinc-600 dark:text-zinc-300">
                          {categoryNameById.get(item.categoryId) ?? "-"}
                        </td>
                        <td className="py-3 pr-3 tabular-nums">{formatPrice(item.price)}</td>
                        <td className="py-3 pr-3">
                          {item.isAvailable ? (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-50">
                              售卖中
                            </span>
                          ) : (
                            <span className="rounded-full bg-zinc-200 px-2.5 py-1 text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-50">
                              已下架
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-3">
                          <button
                            type="button"
                            onClick={() => {
                              toggleAvailable(item).catch((err: unknown) => {
                                const message = err instanceof Error ? err.message : "Unknown error";
                                setToast({ type: "error", title: "更新失败", description: message });
                              });
                            }}
                            disabled={savingItemId === item.id}
                            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-black/30 dark:hover:bg-zinc-900"
                          >
                            {savingItemId === item.id ? "处理中…" : item.isAvailable ? "下架" : "上架"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
