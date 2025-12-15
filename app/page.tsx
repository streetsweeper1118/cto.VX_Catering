import Link from "next/link";

function CardLink({
  href,
  title,
  description,
  hint,
}: {
  href: string;
  title: string;
  description: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/70 p-6 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800/70 dark:bg-zinc-950/50"
    >
      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-emerald-200/40 blur-2xl dark:bg-emerald-500/10" />
        <div className="absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-sky-200/30 blur-2xl dark:bg-sky-500/10" />
      </div>

      <div className="relative flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <div className="text-base font-semibold tracking-tight">{title}</div>
          <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-600 shadow-sm transition group-hover:border-zinc-300 dark:border-zinc-800 dark:bg-black dark:text-zinc-300">
            {hint}
          </span>
        </div>
        <div className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{description}</div>
        <div className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
          进入
          <span className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(80%_60%_at_10%_0%,rgba(16,185,129,0.20),transparent_60%),radial-gradient(70%_55%_at_90%_10%,rgba(56,189,248,0.18),transparent_55%)] px-6 py-14 text-zinc-900 dark:bg-[radial-gradient(80%_60%_at_10%_0%,rgba(16,185,129,0.12),transparent_60%),radial-gradient(70%_55%_at_90%_10%,rgba(56,189,248,0.10),transparent_55%)] dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-zinc-900 text-white shadow-sm dark:bg-zinc-50 dark:text-zinc-900">
              <span className="text-sm font-semibold">餐</span>
            </div>
            <div className="flex flex-col">
              <div className="text-sm font-semibold tracking-tight">餐饮点单 Demo</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-300">后台 + 点单端（本地 JSON 存储）</div>
            </div>
          </div>

          <Link
            href="/api/menu"
            className="rounded-full border border-zinc-200 bg-white/70 px-4 py-2 text-sm text-zinc-700 shadow-sm backdrop-blur transition hover:bg-white dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-200 dark:hover:bg-zinc-950"
          >
            查看 API
          </Link>
        </header>

        <section className="flex flex-col gap-4">
          <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            一个“高级感”餐饮点单原型：
            <span className="text-emerald-700 dark:text-emerald-300"> 交互</span>、
            <span className="text-sky-700 dark:text-sky-300"> 视觉</span> 与
            <span className="text-zinc-700 dark:text-zinc-200"> 可用性</span>
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            适合做微信小程序后端/管理端的接口原型，也可以直接用作前端联调。
            菜单、下单、订单管理一应俱全。
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <CardLink
            href="/order"
            title="顾客点单端"
            description="浏览菜单、搜索菜品、加入购物车并提交订单。"
            hint="Order"
          />
          <CardLink
            href="/admin"
            title="后台管理端"
            description="维护分类/菜品，上下架；查看订单并更新制作状态。"
            hint="Admin"
          />
        </section>

        <section className="rounded-2xl border border-zinc-200/70 bg-white/60 p-6 text-sm text-zinc-600 shadow-sm backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/50 dark:text-zinc-300">
          <div className="flex items-center justify-between gap-3">
            <div className="font-medium text-zinc-900 dark:text-zinc-50">常用 API</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">建议用 Postman / 小程序请求测试</div>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            <li>
              <code className="rounded-lg bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-900">GET /api/menu</code>
            </li>
            <li>
              <code className="rounded-lg bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-900">POST /api/orders</code>
            </li>
            <li>
              <code className="rounded-lg bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-900">GET /api/admin/orders</code>
            </li>
            <li>
              <code className="rounded-lg bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-900">PATCH /api/admin/orders/:id</code>
            </li>
          </ul>
        </section>

        <footer className="pt-2 text-xs text-zinc-500 dark:text-zinc-400">
          提示：首次访问 API 会在 <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-900">data/db.json</code> 生成示例数据。
        </footer>
      </main>
    </div>
  );
}
