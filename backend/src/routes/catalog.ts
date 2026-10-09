import { Router } from "express";
import { z } from "zod";
import { allProductIds, getProduct, listColors, listProducts, loadProducts, productExists, similarProducts } from "../repo/products.js";
import { addWishlist, getCart, getSettings, removeWishlist, saveCart, wishlistIds } from "../repo/misc.js";
import { auth, currentUser, param } from "../middleware.js";
import type { CartItem } from "../types.js";

const router = Router();

router.get("/settings", async (_request, response) => {
  response.json({ settings: await getSettings() });
});

router.get("/products", async (request, response) => {
  const query = z
    .object({
      category: z.string().optional(),
      gender: z.enum(["men", "women", "unisex"]).optional(),
      color: z.string().optional(),
      q: z.string().trim().max(100).optional(),
      sort: z.enum(["newest", "price-asc", "price-desc", "name", "rating"]).optional(),
      minPrice: z.coerce.number().nonnegative().optional(),
      maxPrice: z.coerce.number().nonnegative().optional(),
      isNew: z.enum(["true", "false"]).optional(),
      bestSeller: z.enum(["true", "false"]).optional(),
      inStock: z.enum(["true", "false"]).optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
    })
    .safeParse(request.query);
  if (!query.success) {
    response.status(400).json({ message: "Invalid filters." });
    return;
  }
  const { isNew, bestSeller, inStock, ...rest } = query.data;
  const products = await listProducts({ ...rest, isNew: isNew === "true", bestSeller: bestSeller === "true", inStock: inStock === "true" });
  response.json({ products, total: products.length });
});

// Product addresses for the website's sitemap.xml (search engines use it to find every product).
router.get("/sitemap-data", async (_request, response) => {
  response.json({ products: (await allProductIds()).map((row) => ({ id: row.id, createdAt: row.created_at.toISOString() })) });
});

router.get("/colors", async (_request, response) => {
  response.json({ colors: await listColors() });
});

router.get("/products/:id", async (request, response) => {
  const product = await getProduct(param(request, "id"));
  if (!product) {
    response.status(404).json({ message: "Product not found." });
    return;
  }
  response.json({ product });
});

router.get("/products/:id/similar", async (request, response) => {
  const product = await getProduct(param(request, "id"));
  if (!product) {
    response.status(404).json({ message: "Product not found." });
    return;
  }
  response.json({ products: await similarProducts(product.id, product.category) });
});

/* ---- Server-side copy of a logged-in customer's cart ---- */

const cartItemSchema = z.object({
  productId: z.string().min(1),
  size: z.string().min(1).max(20),
  color: z.string().min(1).max(40),
  quantity: z.number().int().positive().max(99),
});

const cartResponse = async (items: CartItem[]) => {
  const products = await loadProducts(items.map((item) => item.productId));
  return items.flatMap((item) => {
    const product = products.get(item.productId);
    return product ? [{ ...item, product }] : [];
  });
};

router.get("/cart", auth, async (_request, response) => {
  response.json({ items: await cartResponse(await getCart(currentUser(response).id)) });
});

router.put("/cart", auth, async (request, response) => {
  const parsed = z.object({ items: z.array(cartItemSchema).max(100) }).safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Invalid cart." });
    return;
  }
  const products = await loadProducts(parsed.data.items.map((item) => item.productId));
  const merged = new Map<string, CartItem>();
  for (const item of parsed.data.items) {
    if (!products.has(item.productId)) continue;
    const key = `${item.productId}|${item.size}|${item.color}`;
    merged.set(key, { ...item, quantity: Math.min(99, (merged.get(key)?.quantity ?? 0) + item.quantity) });
  }
  const items = [...merged.values()];
  await saveCart(currentUser(response).id, items);
  response.json({ items: await cartResponse(items) });
});

/* ---- Wishlist ---- */

router.get("/wishlist", auth, async (_request, response) => {
  const ids = await wishlistIds(currentUser(response).id);
  const products = await listProducts({});
  const byId = new Map(products.map((product) => [product.id, product]));
  response.json({ ids, products: ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : [])) });
});

router.put("/wishlist/:id", auth, async (request, response) => {
  const id = param(request, "id");
  if (!(await productExists(id))) {
    response.status(404).json({ message: "Product not found." });
    return;
  }
  await addWishlist(currentUser(response).id, id);
  response.json({ ids: await wishlistIds(currentUser(response).id) });
});

router.delete("/wishlist/:id", auth, async (request, response) => {
  await removeWishlist(currentUser(response).id, param(request, "id"));
  response.json({ ids: await wishlistIds(currentUser(response).id) });
});

export default router;
