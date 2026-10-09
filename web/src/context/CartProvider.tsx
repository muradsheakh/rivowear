"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CartContext, type CartProduct } from "./cart";
import { api } from "../shared/api/client";
import { useAuth } from "../shared/context/useAuth";

const STORAGE_KEY = "rivowear-cart";
const keyOf = (item: Pick<CartProduct, "productId" | "size" | "color">) =>
  `${item.productId}|${item.size}|${item.color}`;

const readStored = (): CartProduct[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? (JSON.parse(stored) as CartProduct[]) : [];
    // Older versions stored numeric product ids; those no longer exist on the server.
    return parsed.filter((item) => typeof item.productId === "string");
  } catch {
    return [];
  }
};

// Merge the saved account cart with the guest cart. Same item => keep the larger quantity,
// so reloading the page never doubles quantities.
const mergeCarts = (server: CartProduct[], local: CartProduct[]): CartProduct[] => {
  const merged = new Map(server.map((item) => [keyOf(item), item]));
  for (const item of local) {
    const existing = merged.get(keyOf(item));
    merged.set(keyOf(item), existing ? { ...existing, quantity: Math.max(existing.quantity, item.quantity) } : item);
  }
  return [...merged.values()];
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { token } = useAuth();
  const [cartProducts, setCartProducts] = useState<CartProduct[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [syncedToken, setSyncedToken] = useState<string | null>(null);
  const previousToken = useRef<string | null>(token);

  // The server renders an empty cart; the saved cart is read once the page is in the browser.
  useEffect(() => {
    setCartProducts(readStored());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(cartProducts));
  }, [cartProducts, hydrated]);

  // Logging out clears the cart so the next visitor on this device starts fresh.
  useEffect(() => {
    if (previousToken.current && !token) setCartProducts([]);
    previousToken.current = token;
  }, [token]);

  // On login/reload: load the account cart and merge the guest cart into it.
  useEffect(() => {
    if (!token || !hydrated) return;
    let cancelled = false;
    api
      .cart(token)
      .then(({ items }) => {
        if (cancelled) return;
        const server = items.map((item) => ({
          productId: item.product.id,
          name: item.product.name,
          price: item.product.price,
          image: item.product.colors.find((color) => color.name === item.color)?.images[0] ?? item.product.image,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
        }));
        setCartProducts((local) => mergeCarts(server, local));
      })
      .catch((error: Error) => console.error("Unable to load cart:", error.message))
      .finally(() => {
        if (!cancelled) setSyncedToken(token);
      });
    return () => {
      cancelled = true;
    };
  }, [token, hydrated]);

  // After the first sync, push every change to the server (debounced).
  useEffect(() => {
    if (!token || syncedToken !== token) return;
    const timer = window.setTimeout(() => {
      api
        .saveCart(
          token,
          cartProducts.map(({ productId, size, color, quantity }) => ({ productId, size, color, quantity })),
        )
        .catch((error: Error) => console.error("Unable to sync cart:", error.message));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [cartProducts, token, syncedToken]);

  const addToCart = useCallback((product: Omit<CartProduct, "quantity">, quantity: number) => {
    setCartProducts((products) => {
      const existing = products.find((item) => keyOf(item) === keyOf(product));
      if (existing) {
        return products.map((item) =>
          item === existing
            ? { ...item, maxStock: product.maxStock ?? item.maxStock, quantity: Math.min(product.maxStock ?? 99, 99, item.quantity + quantity) }
            : item,
        );
      }
      return [...products, { ...product, quantity }];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, size: string, color: string, change: number) => {
    setCartProducts((products) =>
      products.map((item) =>
        keyOf(item) === keyOf({ productId, size, color })
          ? { ...item, quantity: Math.min(item.maxStock ?? 99, 99, Math.max(1, item.quantity + change)) }
          : item,
      ),
    );
  }, []);

  const removeProduct = useCallback((productId: string, size: string, color: string) => {
    setCartProducts((products) => products.filter((item) => keyOf(item) !== keyOf({ productId, size, color })));
  }, []);

  const clearCart = useCallback(() => setCartProducts([]), []);

  const value = useMemo(
    () => ({
      cartProducts,
      addToCart,
      updateQuantity,
      removeProduct,
      clearCart,
      itemCount: cartProducts.reduce((total, item) => total + item.quantity, 0),
      subtotal: cartProducts.reduce((total, item) => total + item.price * item.quantity, 0),
    }),
    [addToCart, cartProducts, clearCart, removeProduct, updateQuantity],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
