export type MenuCategory = {
  id: string;
  name: string;
  sort: number;
};

export type MenuItem = {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
  isAvailable: boolean;
  sort: number;
};

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "served"
  | "paid"
  | "cancelled";

export type OrderItem = {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
};

export type Order = {
  id: string;
  createdAt: string;
  status: OrderStatus;
  table?: string;
  note?: string;
  items: OrderItem[];
  total: number;
};

export type DB = {
  categories: MenuCategory[];
  items: MenuItem[];
  orders: Order[];
};
