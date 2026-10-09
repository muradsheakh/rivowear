"use client";

import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { useNavigate } from "@/shared/router";
import { api } from "../api/client";
import { useAuth } from "./useAuth";
import { WishlistContext } from "./wishlistContext";

const NONE: string[] = [];

export const WishlistProvider = ({ children }: PropsWithChildren) => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState<string[]>(NONE);
  // Logged-out visitors never have a wishlist.
  const ids = token ? saved : NONE;

  useEffect(() => {
    if (!token) return;
    api.wishlist(token).then((response) => setSaved(response.ids)).catch(() => undefined);
  }, [token]);

  const toggle = useCallback(
    async (productId: string) => {
      if (!token) {
        navigate("/login?from=%2Fwishlist");
        return;
      }
      const result = ids.includes(productId) ? await api.removeWishlist(token, productId) : await api.addWishlist(token, productId);
      setSaved(result.ids);
    },
    [ids, navigate, token],
  );

  const value = useMemo(() => ({ ids, toggle }), [ids, toggle]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};
