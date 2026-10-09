import { useContext } from "react";
import { WishlistContext } from "./wishlistContext";

export const useWishlist = () => useContext(WishlistContext);
