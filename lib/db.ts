import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import type {
  DB,
  MenuCategory,
  MenuItem,
  Order,
  OrderItem,
  OrderStatus,
  StoreHours,
  StoreMode,
  StoreSettings,
} from "@/lib/types";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "db.json");

let writeQueue: Promise<void> = Promise.resolve();

function parseTimeToMinutes(time: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time.trim());
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  return hours * 60 + minutes;
}

function seedStoreSettings(): StoreSettings {
  return {
    mode: "hours",
    manualIsOpen: true,
    hours: { open: "09:00", close: "21:00" },
    closedMessage: "本店已打烊",
  };
}

function normalizeStoreSettings(input: unknown): StoreSettings {
  const seed = seedStoreSettings();
  if (!input || typeof input !== "object") return seed;

  const obj = input as Partial<StoreSettings>;
  const mode: StoreMode = obj.mode === "manual" || obj.mode === "hours" ? obj.mode : seed.mode;
  const manualIsOpen = typeof obj.manualIsOpen === "boolean" ? obj.manualIsOpen : seed.manualIsOpen;

  const open = typeof obj.hours?.open === "string" ? obj.hours.open : seed.hours.open;
  const close = typeof obj.hours?.close === "string" ? obj.hours.close : seed.hours.close;

  const hours: StoreHours = {
    open: parseTimeToMinutes(open) === null ? seed.hours.open : open,
    close: parseTimeToMinutes(close) === null ? seed.hours.close : close,
  };

  const closedMessage =
    typeof obj.closedMessage === "string" && obj.closedMessage.trim()
      ? obj.closedMessage.trim()
      : seed.closedMessage;

  return { mode, manualIsOpen, hours, closedMessage };
}

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
    store: seedStoreSettings(),
    categories,
    items,
    orders: [],
  };
}

function normalizeDB(input: unknown): DB {
  const seed = seedDB();

  if (!input || typeof input !== "object") {
    return seed;
  }

  const obj = input as Partial<DB>;

  return {
    store: normalizeStoreSettings(obj.store),
    categories: Array.isArray(obj.categories) ? (obj.categories as MenuCategory[]) : seed.categories,
    items: Array.isArray(obj.items) ? (obj.items as MenuItem[]) : seed.items,
    orders: Array.isArray(obj.orders) ? (obj.orders as Order[]) : [],
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
  return normalizeDB(JSON.parse(raw) as unknown);
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

export type StoreStatus = {
  isOpen: boolean;
  mode: StoreMode;
  hours: StoreHours;
  message: string;
  nextChangeAt?: string;
  nextChange?: "open" | "close";
};

function buildDateAtMinutes(now: Date, minutes: number, dayOffset: number) {
  const date = new Date(now);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date;
}

function computeStoreStatus(store: StoreSettings, now = new Date()): StoreStatus {
  if (store.mode === "manual") {
    return {
      isOpen: store.manualIsOpen,
      mode: store.mode,
      hours: store.hours,
      message: store.manualIsOpen
        ? "营业中"
        : `${store.closedMessage}（营业时间 ${store.hours.open}-${store.hours.close}）`,
    };
  }

  const openMin = parseTimeToMinutes(store.hours.open) ?? 0;
  const closeMin = parseTimeToMinutes(store.hours.close) ?? 0;
  const nowMin = now.getHours() * 60 + now.getMinutes();

  if (openMin === closeMin) {
    return {
      isOpen: true,
      mode: store.mode,
      hours: store.hours,
      message: "营业中 · 24小时",
    };
  }

  const isOpen =
    openMin < closeMin
      ? nowMin >= openMin && nowMin < closeMin
      : nowMin >= openMin || nowMin < closeMin;

  let nextChangeAt: string | undefined;
  let nextChange: "open" | "close" | undefined;

  if (isOpen) {
    nextChange = "close";
    if (openMin < closeMin) {
      nextChangeAt = buildDateAtMinutes(now, closeMin, 0).toISOString();
    } else {
      nextChangeAt =
        nowMin >= openMin
          ? buildDateAtMinutes(now, closeMin, 1).toISOString()
          : buildDateAtMinutes(now, closeMin, 0).toISOString();
    }
  } else {
    nextChange = "open";
    if (openMin < closeMin) {
      nextChangeAt = (nowMin < openMin
        ? buildDateAtMinutes(now, openMin, 0)
        : buildDateAtMinutes(now, openMin, 1)
      ).toISOString();
    } else {
      nextChangeAt = buildDateAtMinutes(now, openMin, 0).toISOString();
    }
  }

  return {
    isOpen,
    mode: store.mode,
    hours: store.hours,
    message: isOpen
      ? `营业中 · ${store.hours.open}-${store.hours.close}`
      : `${store.closedMessage}（营业时间 ${store.hours.open}-${store.hours.close}）`,
    nextChangeAt,
    nextChange,
  };
}

export async function getStoreSettings(): Promise<StoreSettings> {
  const db = await getDB();
  return db.store;
}

export async function getStoreStatus(): Promise<StoreStatus> {
  const db = await getDB();
  return computeStoreStatus(db.store);
}

export type UpdateStoreSettingsInput = Partial<
  Pick<StoreSettings, "mode" | "manualIsOpen" | "hours" | "closedMessage">
>;

export async function updateStoreSettings(input: UpdateStoreSettingsInput): Promise<StoreSettings> {
  let updated: StoreSettings | undefined;

  await updateDB((db) => {
    const next: StoreSettings = {
      ...db.store,
      mode: input.mode ?? db.store.mode,
      manualIsOpen: input.manualIsOpen ?? db.store.manualIsOpen,
      hours: {
        open: input.hours?.open ?? db.store.hours.open,
        close: input.hours?.close ?? db.store.hours.close,
      },
      closedMessage: input.closedMessage ?? db.store.closedMessage,
    };

    if (parseTimeToMinutes(next.hours.open) === null || parseTimeToMinutes(next.hours.close) === null) {
      throw new Error("Invalid hours format, expected HH:mm");
    }

    if (!next.closedMessage.trim()) {
      throw new Error("Closed message is required");
    }

    const nextStore: StoreSettings = {
      ...next,
      closedMessage: next.closedMessage.trim(),
    };

    updated = nextStore;
    return { ...db, store: nextStore };
  });

  if (!updated) {
    throw new Error("Store settings update failed");
  }

  return updated;
}

export type MenuResponse = {
  store: StoreStatus;
  categories: Array<MenuCategory & { items: MenuItem[] }>;
};

export async function getMenu(): Promise<MenuResponse> {
  const db = await getDB();

  const categories = [...db.categories].sort((a, b) => a.sort - b.sort);
  const items = [...db.items]
    .filter((i) => i.isAvailable)
    .sort((a, b) => a.sort - b.sort);

  return {
    store: computeStoreStatus(db.store),
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

export class StoreClosedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoreClosedError";
  }
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
    const store = computeStoreStatus(db.store);
    if (!store.isOpen) {
      throw new StoreClosedError(store.message);
    }

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
