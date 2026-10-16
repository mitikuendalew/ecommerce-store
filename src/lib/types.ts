export type Role = "CUSTOMER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface ProductImage {
  id?: string;
  url: string;
  alt: string | null;
  position?: number;
}

/** Optional. Renders variant selectors (Size, Color…) when the API provides them. */
export interface ProductOption {
  name: string;
  values: string[];
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  sku: string;
  stock: number;
  isActive: boolean;
  category: { id: string; name: string; slug: string };
  images: ProductImage[];
  options?: ProductOption[];
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CartItem {
  id: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  available: boolean;
  product: {
    id: string;
    name: string;
    slug: string;
    stock: number;
    image: { url: string; alt: string | null } | null;
  };
}

export interface Cart {
  id: string;
  items: CartItem[];
  itemCount: number;
  subtotalCents: number;
  currency: string;
}

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export interface OrderItem {
  id: string;
  productName: string;
  sku: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  currency: string;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  createdAt: string;
  shippingName: string;
  shippingLine1: string;
  shippingLine2: string | null;
  shippingCity: string;
  shippingRegion: string | null;
  shippingPostalCode: string | null;
  shippingCountry: string;
  items: OrderItem[];
  payments: { id: string; method: string; status: string; amountCents: number }[];
}
