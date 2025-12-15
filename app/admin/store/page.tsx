"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { StoreMode, StoreSettings } from "@/lib/types";

type StoreStatus = {
  isOpen: boolean;
  mode: StoreMode;
  hours: { open: string; close: string };
  message: string;
  nextChangeAt?: string;
  nextChange?: "open" | "close";
};

type Toast = {
  type: "success" | "error" | "info";
  title: string;
  description?: string;
};

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full border shadow-sm transition ${
        checked
          ? "border-emerald-200 bg-emerald-600 dark:border-emerald-900/40"
          : "border-zinc-200 bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-800"
      }`}
    >
      <span
        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function AdminStorePage() {
  const [store, setStore] = useState<StoreSettings | null>(null);
  const [status, setStatus] = useState<StoreStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/store", { cache: "no-store" });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? `Failed to load store settings (${res.status})`);
    }

    const data = (await res.json()) as { store: StoreSettings };
    setStore(data.store);

    const statusRes = await fetch("/api/store", { cache: "no-store" });
    if (statusRes.ok) {
      const statusData = (await statusRes.json()) as { store: StoreStatus };
      setStatus(statusData.store);
    }
  }, []);

  useEffect(() => {
    load().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : "Unknown error";
      setToast({ type: "error", title: "加载失败", description: message });
    });
  }, [load]);

  const preview = useMemo(() => {
    if (!status) return null;

    const next = status.nextChangeAt ? new Date(status.nextChangeAt) : null;
    const nextText = next
      ? next.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : null;

    return {
      badge: status.isOpen
        ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-50"
        : "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-50",
      label: status.isOpen ? "营业中" : "已打烊",
      message: status.message,
      nextText: nextText ? `${status.nextChange === "open" ? "预计开店" : "预计打烊"}：${nextText}` : null,
    };
  }, [status]);

  async function save(next: StoreSettings) {
    setSaving(true);

    try {
      const res = await fetch("/api/admin/store", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });

      const data = (await res.json().catch(() => null)) as
        | { store?: StoreSettings; error?: string }
        | null;

      if (!res.ok) {
        throw new Error(data?.error ?? `Failed to save (${res.status})`);
      }

      setStore(data?.store ?? next);
      setToast({ type: "success", title: "已保存" });

      const statusRes = await fetch("/api/store", { cache: "no-store" });
      if (statusRes.ok) {
        const statusData = (await statusRes.json()) as { store: StoreStatus };
        setStatus(statusData.store);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-900 dark:bg-black dark:text-zinc-50">
        <div className="mx-auto w-full max-w-5xl">加载中…</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(80%_60%_at_10%_0%,rgba(16,185,129,0.16),transparent_55%),radial-gradient(70%_55%_at_90%_10%,rgba(56,189,248,0.12),transparent_55%)] px-6 py-8 text-zinc-900 dark:bg-[radial-gradient(80%_60%_at_10%_0%,rgba(16,185,129,0.11),transparent_55%),radial-gradient(70%_55%_at_90%_10%,rgba(56,189,248,0.09),transparent_55%)] dark:text-zinc-50">
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

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight">营业设置</h1>
            <div className="text-sm text-zinc-600 dark:text-zinc-300">店铺打烊/营业 · 营业时间 · 打烊提示</div>
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
        </header>

        {preview ? (
          <section className="rounded-2xl border border-zinc-200/70 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/50">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${preview.badge}`}>{preview.label}</span>
                <div className="text-sm font-semibold">{preview.message}</div>
              </div>
              {preview.nextText ? <div className="text-xs text-zinc-500 dark:text-zinc-400">{preview.nextText}</div> : null}
            </div>
          </section>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/50">
            <div className="text-sm font-semibold">营业模式</div>
            <div className="mt-3 grid gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-zinc-600 dark:text-zinc-300">模式</span>
                <select
                  value={store.mode}
                  onChange={(e) => {
                    const mode = e.target.value as StoreMode;
                    const next = { ...store, mode };
                    setStore(next);
                  }}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-200/40 dark:border-zinc-800 dark:bg-black/30 dark:focus:border-emerald-700 dark:focus:ring-emerald-900/40"
                >
                  <option value="hours">按营业时间</option>
                  <option value="manual">手动控制</option>
                </select>
              </label>

              {store.mode === "manual" ? (
                <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white/70 p-4 dark:border-zinc-800 dark:bg-black/20">
                  <div className="flex flex-col">
                    <div className="text-sm font-semibold">当前营业</div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-300">手动切换营业中 / 打烊</div>
                  </div>
                  <Switch
                    checked={store.manualIsOpen}
                    onChange={(v) => setStore((prev) => (prev ? { ...prev, manualIsOpen: v } : prev))}
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 bg-white/70 p-4 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-black/20 dark:text-zinc-300">
                  按营业时间自动判断是否可下单。
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/50">
            <div className="text-sm font-semibold">营业时间 & 打烊提示</div>
            <div className="mt-3 grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-600 dark:text-zinc-300">开店时间 (HH:mm)</span>
                  <input
                    value={store.hours.open}
                    onChange={(e) => setStore((prev) => (prev ? { ...prev, hours: { ...prev.hours, open: e.target.value } } : prev))}
                    className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-200/40 dark:border-zinc-800 dark:bg-black/30 dark:focus:border-emerald-700 dark:focus:ring-emerald-900/40"
                    placeholder="09:00"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-600 dark:text-zinc-300">打烊时间 (HH:mm)</span>
                  <input
                    value={store.hours.close}
                    onChange={(e) => setStore((prev) => (prev ? { ...prev, hours: { ...prev.hours, close: e.target.value } } : prev))}
                    className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-200/40 dark:border-zinc-800 dark:bg-black/30 dark:focus:border-emerald-700 dark:focus:ring-emerald-900/40"
                    placeholder="21:00"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-zinc-600 dark:text-zinc-300">打烊文案</span>
                <input
                  value={store.closedMessage}
                  onChange={(e) => setStore((prev) => (prev ? { ...prev, closedMessage: e.target.value } : prev))}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-200/40 dark:border-zinc-800 dark:bg-black/30 dark:focus:border-emerald-700 dark:focus:ring-emerald-900/40"
                  placeholder="本店已打烊"
                />
              </label>

              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  save(store).catch((err: unknown) => {
                    const message = err instanceof Error ? err.message : "Unknown error";
                    setToast({ type: "error", title: "保存失败", description: message });
                  });
                }}
                className="mt-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {saving ? "保存中…" : "保存设置"}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
