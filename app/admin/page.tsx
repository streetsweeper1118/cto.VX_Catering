import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-8 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">后台管理端</h1>
          <Link href="/" className="text-sm text-zinc-600 underline dark:text-zinc-300">
            返回首页
          </Link>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <Link
            href="/admin/menu"
            className="rounded-lg border border-zinc-200 bg-white p-5 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
          >
            <div className="text-base font-medium">菜单管理</div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">新增/下架菜品与分类。</div>
          </Link>

          <Link
            href="/admin/orders"
            className="rounded-lg border border-zinc-200 bg-white p-5 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
          >
            <div className="text-base font-medium">订单管理</div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">查看订单并更新状态。</div>
          </Link>
        </section>
      </main>
    </div>
  );
}
