"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./client";
import { useAuth } from "./auth-context";
import type { Cart } from "./types";

interface CartState {
  cart: Cart | null;
  loading: boolean;
  refresh(): Promise<void>;
  add(productId: string, quantity: number, variant?: Record<string, string>): Promise<void>;
  setQuantity(itemId: string, quantity: number): Promise<void>;
  remove(itemId: string): Promise<void>;
  clear(): Promise<void>;
}

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setCart(await api<Cart>("/api/cart"));
  }, []);

  // Load the cart when the user signs in; drop it when they sign out.
  useEffect(() => {
    if (status === "authenticated") {
      setLoading(true);
      refresh()
        .catch(() => setCart(null))
        .finally(() => setLoading(false));
    } else if (status === "anonymous") {
      setCart(null);
    }
  }, [status, refresh]);

  // Every mutation returns the full, server-priced cart, so the UI never computes totals on its own.
  const add = useCallback<CartState["add"]>(async (productId, quantity, variant) => {
    setCart(await api<Cart>("/api/cart/items", { method: "POST", body: JSON.stringify({ productId, quantity, variant }) }));
  }, []);

  const setQuantity = useCallback<CartState["setQuantity"]>(async (itemId, quantity) => {
    setCart(await api<Cart>(`/api/cart/items/${itemId}`, { method: "PATCH", body: JSON.stringify({ quantity }) }));
  }, []);

  const remove = useCallback<CartState["remove"]>(async (itemId) => {
    setCart(await api<Cart>(`/api/cart/items/${itemId}`, { method: "DELETE" }));
  }, []);

  const clear = useCallback(async () => {
    setCart(await api<Cart>("/api/cart", { method: "DELETE" }));
  }, []);

  const value = useMemo(
    () => ({ cart, loading, refresh, add, setQuantity, remove, clear }),
    [cart, loading, refresh, add, setQuantity, remove, clear],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
