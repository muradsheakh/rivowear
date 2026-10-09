"use client";

import { createContext } from "react";

export type WishlistValue = { ids: string[]; toggle: (productId: string) => Promise<void> };
export const WishlistContext = createContext<WishlistValue>({ ids: [], toggle: async () => undefined });
