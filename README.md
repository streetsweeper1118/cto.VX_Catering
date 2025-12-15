## 餐饮点单 Demo（后台 + 点单端）

这是一个基于 Next.js App Router 的最小可用原型：

- 点单端：`/order`
- 后台管理端：`/admin`
- 菜单 API：`GET /api/menu`
- 下单 API：`POST /api/orders`
- 订单管理 API：`GET /api/admin/orders` / `PATCH /api/admin/orders/:id`
- 店铺营业状态：`GET /api/store`（打烊时会返回提示文案）
- 店铺营业设置：`GET/PUT /api/admin/store`

数据默认使用本地 JSON 文件（`data/db.json`，会在首次访问 API 时自动生成）。

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
