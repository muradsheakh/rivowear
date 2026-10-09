"use client";

import { createContext } from "react";

export interface CartProduct {
  productId: string;
  name: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  image: string;
  /** Stock of this exact color and size when it was added, so the cart never asks for more than exists. */
  maxStock?: number;
}

export interface CartContextValue {
  cartProducts: CartProduct[];
  addToCart: (product: Omit<CartProduct, "quantity">, quantity: number) => void;
  updateQuantity: (productId: string, size: string, color: string, change: number) => void;
  removeProduct: (productId: string, size: string, color: string) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
}

export const CartContext = createContext<CartContextValue | undefined>(undefined);
