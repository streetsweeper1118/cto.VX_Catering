"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { MenuCategory, MenuItem } from "@/lib/types";

function formatPrice(price: number) {
  return `¥${price.toFixed(2)}`;
}

export default function AdminMenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("28");
  const [newItemCategoryId, setNewItemCategoryId] = useState<string>("");
  const [newItemDescription, setNewItemDescription] = useState("");

  const categoryNameById = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name] as const));
    return map;
  }, [categories]);

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
      setError("分类名称不能为空");
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
    await load();
  }

  async function createItem() {
    const name = newItemName.trim();
    if (!name) {
      setError("菜品名称不能为空");
      return;
    }

    const price = Number(newItemPrice);
    if (!Number.isFinite(price) || price < 0) {
      setError("价格必须是非负数字");
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
    await load();
  }

  async function toggleAvailable(item: MenuItem) {
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
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-8 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold">菜单管理</h1>
            <div className="text-sm text-zinc-600 dark:text-zinc-300">分类 / 菜品（本地 JSON 存储）</div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm text-zinc-600 underline dark:text-zinc-300">
              返回后台
            </Link>
            <Link href="/" className="text-sm text-zinc-600 underline dark:text-zinc-300">
              首页
            </Link>
          </div>
        </header>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-50">
            {error}
          </div>
        ) : null}

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-base font-medium">新增分类</div>
            <div className="mt-3 flex gap-2">
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 rounded border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                placeholder="例如：主食"
              />
              <button
                type="button"
                onClick={() => {
                  createCategory().catch((err: unknown) => {
                    const message = err instanceof Error ? err.message : "Unknown error";
                    setError(message);
                  });
                }}
                className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                添加
              </button>
            </div>

            <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">现有分类：</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {categories.map((c) => (
                <span
                  key={c.id}
                  className="rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs dark:border-zinc-800 dark:bg-zinc-900"
                >
                  {c.name}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-base font-medium">新增菜品</div>

            <div className="mt-3 grid gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-zinc-600 dark:text-zinc-300">分类</span>
                <select
                  value={newItemCategoryId}
                  onChange={(e) => setNewItemCategoryId(e.target.value)}
                  className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
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
                  className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                  placeholder="例如：番茄炒蛋"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-zinc-600 dark:text-zinc-300">价格</span>
                <input
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                  placeholder="例如：18"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-zinc-600 dark:text-zinc-300">描述（可选）</span>
                <input
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                  placeholder="例如：招牌菜"
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  createItem().catch((err: unknown) => {
                    const message = err instanceof Error ? err.message : "Unknown error";
                    setError(message);
                  });
                }}
                className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                添加菜品
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <div className="text-base font-medium">菜品列表</div>
            {loading ? <div className="text-sm text-zinc-500">加载中…</div> : null}
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs text-zinc-600 dark:text-zinc-300">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2 pr-3">名称</th>
                  <th className="py-2 pr-3">分类</th>
                  <th className="py-2 pr-3">价格</th>
                  <th className="py-2 pr-3">状态</th>
                  <th className="py-2 pr-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="py-2 pr-3 font-medium">{item.name}</td>
                    <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-300">
                      {categoryNameById.get(item.categoryId) ?? "-"}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{formatPrice(item.price)}</td>
                    <td className="py-2 pr-3">
                      {item.isAvailable ? (
                        <span className="rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-50">
                          售卖中
                        </span>
                      ) : (
                        <span className="rounded bg-zinc-200 px-2 py-1 text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-50">
                          已下架
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <button
                        type="button"
                        onClick={() => {
                          toggleAvailable(item).catch((err: unknown) => {
                            const message = err instanceof Error ? err.message : "Unknown error";
                            setError(message);
                          });
                        }}
                        className="rounded border border-zinc-200 bg-white px-3 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                      >
                        {item.isAvailable ? "下架" : "上架"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
