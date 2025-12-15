import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import type { DB, MenuCategory, MenuItem, Order, OrderItem, OrderStatus } from "@/lib/types";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "db.json");

let writeQueue: Promise<void> = Promise.resolve();

function seedDB(): DB {
  const categories: MenuCategory[] = [
    { id: "cat-hot", name: "热菜", sort: 1 },
    { id: "cat-cold", name: "凉菜", sort: 2 },
    { id: "cat-drink", name: "饮品", sort: 3 },
  ];

  const items: MenuItem[] = [
    {
      id: "item-001",
      categoryId: "cat-hot",
      name: "宫保鸡丁",
      price: 28,
      description: "微辣，配花生米",
      isAvailable: true,
      sort: 1,
    },
    {
      id: "item-002",
      categoryId: "cat-hot",
      name: "鱼香肉丝",
      price: 26,
      description: "酸甜口",
      isAvailable: true,
      sort: 2,
    },
    {
      id: "item-101",
      categoryId: "cat-cold",
      name: "凉拌黄瓜",
      price: 12,
      isAvailable: true,
      sort: 1,
    },
    {
      id: "item-201",
      categoryId: "cat-drink",
      name: "可乐",
      price: 6,
      isAvailable: true,
      sort: 1,
    },
  ];

  return {
    categories,
    items,
    orders: [],
  };
}

async function ensureDBFile(): Promise<void> {
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.mkdir(DB_DIR, { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(seedDB(), null, 2), "utf8");
  }
}

async function readDBUnsafe(): Promise<DB> {
  await ensureDBFile();
  const raw = await fs.readFile(DB_PATH, "utf8");
  return JSON.parse(raw) as DB;
}

async function writeDBUnsafe(db: DB): Promise<void> {
  await fs.mkdir(DB_DIR, { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

export async function getDB(): Promise<DB> {
  await writeQueue.catch(() => undefined);
  return readDBUnsafe();
}

export async function updateDB(updater: (db: DB) => DB): Promise<DB> {
  const task = writeQueue.then(async () => {
    const current = await readDBUnsafe();
    const updated = updater(current);
    await writeDBUnsafe(updated);
    return updated;
  });

  writeQueue = task
    .then(() => undefined)
    .catch(() => undefined);

  return task;
}

export type MenuResponse = {
  categories: Array<MenuCategory & { items: MenuItem[] }>;
};

export async function getMenu(): Promise<MenuResponse> {
  const db = await getDB();

  const categories = [...db.categories].sort((a, b) => a.sort - b.sort);
  const items = [...db.items]
    .filter((i) => i.isAvailable)
    .sort((a, b) => a.sort - b.sort);

  return {
    categories: categories.map((c) => ({
      ...c,
      items: items.filter((i) => i.categoryId === c.id),
    })),
  };
}

export async function listCategories(): Promise<MenuCategory[]> {
  const db = await getDB();
  return [...db.categories].sort((a, b) => a.sort - b.sort);
}

export async function listItems(): Promise<MenuItem[]> {
  const db = await getDB();
  return [...db.items].sort((a, b) => a.sort - b.sort);
}

export type CreateCategoryInput = {
  name: string;
  sort?: number;
};

export async function createCategory(input: CreateCategoryInput): Promise<MenuCategory> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Category name is required");
  }

  const sort = input.sort ?? Date.now();

  const category: MenuCategory = {
    id: crypto.randomUUID(),
    name,
    sort,
  };

  await updateDB((db) => ({
    ...db,
    categories: [...db.categories, category],
  }));

  return category;
}

export type UpdateCategoryInput = {
  name?: string;
  sort?: number;
};

export async function updateCategory(categoryId: string, input: UpdateCategoryInput): Promise<MenuCategory> {
  let updated: MenuCategory | undefined;

  await updateDB((db) => {
    if (input.name !== undefined && !input.name.trim()) {
      throw new Error("Category name is required");
    }

    const categories = db.categories.map((c) => {
      if (c.id !== categoryId) return c;

      const next: MenuCategory = {
        ...c,
        name: input.name !== undefined ? input.name.trim() : c.name,
        sort: input.sort ?? c.sort,
      };
      updated = next;
      return next;
    });

    if (!updated) {
      throw new Error("Category not found");
    }

    return { ...db, categories };
  });

  if (!updated) {
    throw new Error("Category not found");
  }

  return updated;
}

export async function deleteCategory(categoryId: string): Promise<void> {
  await updateDB((db) => ({
    ...db,
    categories: db.categories.filter((c) => c.id !== categoryId),
    items: db.items.filter((i) => i.categoryId !== categoryId),
  }));
}

export type CreateItemInput = {
  categoryId: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
  isAvailable?: boolean;
  sort?: number;
};

export async function createItem(input: CreateItemInput): Promise<MenuItem> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Item name is required");
  }
  if (!Number.isFinite(input.price) || input.price < 0) {
    throw new Error("Item price must be a non-negative number");
  }

  const item: MenuItem = {
    id: crypto.randomUUID(),
    categoryId: input.categoryId,
    name,
    price: input.price,
    description: input.description?.trim() || undefined,
    image: input.image?.trim() || undefined,
    isAvailable: input.isAvailable ?? true,
    sort: input.sort ?? Date.now(),
  };

  await updateDB((db) => {
    const categoryExists = db.categories.some((c) => c.id === input.categoryId);
    if (!categoryExists) {
      throw new Error("Category not found");
    }

    return { ...db, items: [...db.items, item] };
  });

  return item;
}

export type UpdateItemInput = Partial<Omit<CreateItemInput, "categoryId">> & { categoryId?: string };

export async function updateItem(itemId: string, input: UpdateItemInput): Promise<MenuItem> {
  let updated: MenuItem | undefined;

  await updateDB((db) => {
    if (input.name !== undefined && !input.name.trim()) {
      throw new Error("Item name is required");
    }

    if (input.price !== undefined && (!Number.isFinite(input.price) || input.price < 0)) {
      throw new Error("Item price must be a non-negative number");
    }

    if (input.categoryId !== undefined) {
      const categoryExists = db.categories.some((c) => c.id === input.categoryId);
      if (!categoryExists) {
        throw new Error("Category not found");
      }
    }

    const items = db.items.map((i) => {
      if (i.id !== itemId) return i;

      const next: MenuItem = {
        ...i,
        categoryId: input.categoryId ?? i.categoryId,
        name: input.name !== undefined ? input.name.trim() : i.name,
        price: input.price ?? i.price,
        description: input.description !== undefined ? input.description.trim() || undefined : i.description,
        image: input.image !== undefined ? input.image.trim() || undefined : i.image,
        isAvailable: input.isAvailable ?? i.isAvailable,
        sort: input.sort ?? i.sort,
      };

      updated = next;
      return next;
    });

    if (!updated) {
      throw new Error("Item not found");
    }

    return { ...db, items };
  });

  if (!updated) {
    throw new Error("Item not found");
  }

  return updated;
}

export async function deleteItem(itemId: string): Promise<void> {
  await updateDB((db) => ({
    ...db,
    items: db.items.filter((i) => i.id !== itemId),
  }));
}

export type CreateOrderInput = {
  items: Array<{ menuItemId: string; quantity: number }>;
  table?: string;
  note?: string;
};

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const table = input.table?.trim() || undefined;
  const note = input.note?.trim() || undefined;

  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error("Order items are required");
  }

  const orderId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const dbAfter = await updateDB((db) => {
    const itemMap = new Map(db.items.map((i) => [i.id, i] as const));

    const items: OrderItem[] = input.items.map((line) => {
      if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
        throw new Error("Quantity must be a positive number");
      }

      const menuItem = itemMap.get(line.menuItemId);
      if (!menuItem) {
        throw new Error("Menu item not found");
      }
      if (!menuItem.isAvailable) {
        throw new Error("Menu item is not available");
      }

      return {
        menuItemId: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: line.quantity,
      };
    });

    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const nextOrder: Order = {
      id: orderId,
      createdAt,
      status: "pending",
      table,
      note,
      items,
      total,
    };

    return {
      ...db,
      orders: [nextOrder, ...db.orders],
    };
  });

  const created = dbAfter.orders.find((o) => o.id === orderId);
  if (!created) {
    throw new Error("Order creation failed");
  }

  return created;
}

export async function listOrders(): Promise<Order[]> {
  const db = await getDB();
  return [...db.orders];
}

export async function setOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
  let updated: Order | undefined;

  await updateDB((db) => {
    const orders = db.orders.map((o) => {
      if (o.id !== orderId) return o;
      const next: Order = { ...o, status };
      updated = next;
      return next;
    });

    if (!updated) {
      throw new Error("Order not found");
    }

    return { ...db, orders };
  });

  if (!updated) {
    throw new Error("Order not found");
  }

  return updated;
}
