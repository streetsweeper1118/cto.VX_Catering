import Link from "next/link";

function CardLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-zinc-200/70 bg-white/70 p-6 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800/70 dark:bg-zinc-950/50"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-base font-semibold tracking-tight">{title}</div>
        <span className="text-sm text-zinc-500 transition group-hover:translate-x-0.5 dark:text-zinc-400">→</span>
      </div>
      <div className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{description}</div>
    </Link>
  );
}

export default function AdminHomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(80%_60%_at_20%_0%,rgba(99,102,241,0.16),transparent_55%),radial-gradient(70%_55%_at_85%_10%,rgba(16,185,129,0.14),transparent_55%)] px-6 py-10 text-zinc-900 dark:bg-[radial-gradient(80%_60%_at_20%_0%,rgba(99,102,241,0.12),transparent_55%),radial-gradient(70%_55%_at_85%_10%,rgba(16,185,129,0.10),transparent_55%)] dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight">后台管理端</h1>
            <div className="text-sm text-zinc-600 dark:text-zinc-300">分类 / 菜品管理 · 订单状态流转</div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-full border border-zinc-200 bg-white/70 px-4 py-2 text-sm text-zinc-700 shadow-sm backdrop-blur transition hover:bg-white dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-200 dark:hover:bg-zinc-950"
            >
              首页
            </Link>
          </div>
        </header>

        <section className="grid gap-5 md:grid-cols-3">
          <CardLink href="/admin/menu" title="菜单管理" description="新增分类/菜品、上下架、快速筛选与搜索。" />
          <CardLink href="/admin/orders" title="订单管理" description="实时刷新、展开查看明细、更新制作状态。" />
          <CardLink href="/admin/store" title="营业设置" description="营业中/打烊切换、营业时间、打烊文案。" />
        </section>

        <section className="rounded-2xl border border-zinc-200/70 bg-white/60 p-6 text-sm text-zinc-600 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/50 dark:text-zinc-300">
          <div className="font-medium text-zinc-900 dark:text-zinc-50">小贴士</div>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>菜单数据在首次访问接口时初始化到本地 JSON（data/db.json）。</li>
            <li>可用作微信小程序点单端/后台端的接口原型。</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
