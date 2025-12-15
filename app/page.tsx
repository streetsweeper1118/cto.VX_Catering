import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">餐饮点单 Demo</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            用 Next.js 快速搭一个“点单端 + 后台管理端”的最小可用原型（菜单、下单、订单管理）。
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <Link
            href="/order"
            className="rounded-lg border border-zinc-200 bg-white p-5 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
          >
            <div className="flex flex-col gap-1">
              <div className="text-base font-medium">顾客点单端</div>
              <div className="text-sm text-zinc-600 dark:text-zinc-300">
                浏览菜单、加入购物车并提交订单。
              </div>
            </div>
          </Link>

          <Link
            href="/admin"
            className="rounded-lg border border-zinc-200 bg-white p-5 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
          >
            <div className="flex flex-col gap-1">
              <div className="text-base font-medium">后台管理端</div>
              <div className="text-sm text-zinc-600 dark:text-zinc-300">
                维护菜品、查看订单并更新状态。
              </div>
            </div>
          </Link>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          <div className="font-medium text-zinc-900 dark:text-zinc-50">API</div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-900">GET /api/menu</code>
            </li>
            <li>
              <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-900">POST /api/orders</code>
            </li>
            <li>
              <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-900">GET /api/admin/orders</code>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
