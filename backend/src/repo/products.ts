import { one, rows, pool, tx, type Db } from "../db/pool.js";
import type { Gender, Product, Variant } from "../types.js";

export type ProductView = Product & { rating: { average: number; count: number } };

const RATING_JOIN = `
  LEFT JOIN (
    SELECT product_id, ROUND(AVG(rating)::numeric, 1) AS avg, COUNT(*) AS cnt
    FROM reviews WHERE NOT hidden GROUP BY product_id
  ) r ON r.product_id = p.id`;

const VARIANT_JOIN = `
  LEFT JOIN LATERAL (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('color', v.color, 'size', v.size, 'stock', v.stock) ORDER BY v.color, v.size), '[]'::jsonb) AS variants,
           COALESCE(SUM(v.stock), 0) AS stock
    FROM product_variants v WHERE v.product_id = p.id
  ) vs ON true`;

const toProduct = (row: any): Product => ({
  id: row.id,
  name: row.name,
  description: row.description,
  price: row.price,
  image: row.image,
  category: row.category,
  gender: row.gender as Gender,
  brand: row.brand,
  material: row.material,
  sizes: row.sizes,
  colors: row.colors,
  variants: row.variants ?? [],
  stock: row.stock ?? 0,
  isNewArrival: row.is_new_arrival,
  isBestSeller: row.is_best_seller,
  createdAt: row.created_at.toISOString(),
});

const toView = (row: any): ProductView => ({ ...toProduct(row), rating: { average: row.avg ?? 0, count: row.cnt ?? 0 } });

export type ProductFilters = {
  category?: string;
  gender?: string;
  color?: string;
  q?: string;
  sort?: string;
  minPrice?: number;
  maxPrice?: number;
  isNew?: boolean;
  bestSeller?: boolean;
  inStock?: boolean;
  limit?: number;
};

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

export const listProducts = async (filters: ProductFilters): Promise<ProductView[]> => {
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    where.push(sql.replace("?", `$${params.length}`));
  };
  if (filters.category) add("p.category = ?", filters.category);
  if (filters.gender) add("(p.gender = ? OR p.gender = 'unisex')", filters.gender);
  if (filters.color) add("EXISTS (SELECT 1 FROM jsonb_array_elements(p.colors) c WHERE lower(c->>'name') = lower(?))", filters.color);
  if (filters.q) add("(p.name || ' ' || p.description || ' ' || p.category || ' ' || p.brand) ILIKE ?", `%${escapeLike(filters.q)}%`);
  if (filters.minPrice !== undefined) add("p.price >= ?", filters.minPrice);
  if (filters.maxPrice !== undefined) add("p.price <= ?", filters.maxPrice);
  if (filters.isNew) where.push("p.is_new_arrival");
  if (filters.bestSeller) where.push("p.is_best_seller");
  if (filters.inStock) where.push("vs.stock > 0");

  const order =
    filters.sort === "price-asc" ? "p.price ASC"
    : filters.sort === "price-desc" ? "p.price DESC"
    : filters.sort === "name" ? "p.name ASC"
    : filters.sort === "rating" ? "COALESCE(r.avg, 0) DESC, COALESCE(r.cnt, 0) DESC"
    : "p.created_at DESC";

  let sql = `SELECT p.*, vs.variants, vs.stock, r.avg, r.cnt FROM products p ${VARIANT_JOIN} ${RATING_JOIN} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY ${order}, p.id`;
  if (filters.limit) {
    params.push(filters.limit);
    sql += ` LIMIT $${params.length}`;
  }
  return (await rows(sql, params)).map(toView);
};

export const getProduct = async (id: string): Promise<ProductView | undefined> => {
  const row = await one(`SELECT p.*, vs.variants, vs.stock, r.avg, r.cnt FROM products p ${VARIANT_JOIN} ${RATING_JOIN} WHERE p.id = $1`, [id]);
  return row ? toView(row) : undefined;
};

export const similarProducts = async (id: string, category: string): Promise<ProductView[]> =>
  (await rows(
    `SELECT p.*, vs.variants, vs.stock, r.avg, r.cnt FROM products p ${VARIANT_JOIN} ${RATING_JOIN} WHERE p.id <> $1 ORDER BY (p.category = $2) DESC, p.created_at DESC LIMIT 4`,
    [id, category],
  )).map(toView);

export const listColors = async () =>
  rows<{ name: string; hex: string }>(
    `SELECT DISTINCT ON (lower(c->>'name')) initcap(c->>'name') AS name, c->>'hex' AS hex
     FROM products, jsonb_array_elements(colors) c ORDER BY lower(c->>'name')`,
  );

export const allProductIds = async () => rows<{ id: string; created_at: Date }>("SELECT id, created_at FROM products ORDER BY created_at DESC");

/**
 * Loads products (with their color/size stock) by id.
 * With lock=true the stock rows are locked until the surrounding transaction ends, so two checkouts
 * can never both take the last item.
 */
export const loadProducts = async (ids: string[], db: Db = pool, lock = false): Promise<Map<string, Product>> => {
  const sorted = [...new Set(ids)].sort(); // fixed order avoids deadlocks between two checkouts
  const found = await rows("SELECT * FROM products WHERE id = ANY($1)", [sorted], db);
  const variants = await rows<{ product_id: string; color: string; size: string; stock: number }>(
    `SELECT product_id, color, size, stock FROM product_variants WHERE product_id = ANY($1) ORDER BY product_id, color, size ${lock ? "FOR UPDATE" : ""}`,
    [sorted],
    db,
  );
  return new Map(
    found.map((row) => {
      const own: Variant[] = variants.filter((v) => v.product_id === row.id).map((v) => ({ color: v.color, size: v.size, stock: v.stock }));
      return [row.id as string, toProduct({ ...row, variants: own, stock: own.reduce((sum, v) => sum + v.stock, 0) })];
    }),
  );
};

const writeVariants = async (db: Db, productId: string, variants: Variant[]) => {
  await db.query("DELETE FROM product_variants WHERE product_id = $1", [productId]);
  for (const v of variants) {
    await db.query("INSERT INTO product_variants (product_id, color, size, stock) VALUES ($1,$2,$3,$4)", [productId, v.color, v.size, v.stock]);
  }
};

export const insertProduct = async (product: Product) => {
  await tx(async (client) => {
    await client.query(
      `INSERT INTO products (id, name, description, price, image, category, gender, brand, material, sizes, colors, is_new_arrival, is_best_seller, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [product.id, product.name, product.description, product.price, product.image, product.category, product.gender, product.brand, product.material, product.sizes, JSON.stringify(product.colors), product.isNewArrival, product.isBestSeller, product.createdAt],
    );
    await writeVariants(client, product.id, product.variants);
  });
};

const COLUMN: Record<string, string> = {
  name: "name", description: "description", price: "price", image: "image", category: "category", gender: "gender", brand: "brand",
  material: "material", sizes: "sizes", colors: "colors", isNewArrival: "is_new_arrival", isBestSeller: "is_best_seller",
};

export const updateProduct = async (id: string, patch: Record<string, unknown>): Promise<Product | undefined> => {
  const { variants, ...columns } = patch as { variants?: Variant[] } & Record<string, unknown>;
  await tx(async (client) => {
    const sets: string[] = [];
    const params: unknown[] = [id];
    for (const [key, value] of Object.entries(columns)) {
      const column = COLUMN[key];
      if (!column || value === undefined) continue;
      params.push(key === "colors" ? JSON.stringify(value) : value);
      sets.push(`${column} = $${params.length}`);
    }
    if (sets.length > 0) await client.query(`UPDATE products SET ${sets.join(", ")} WHERE id = $1`, params);
    if (variants) await writeVariants(client, id, variants);
    // A color or size that no longer exists on the product cannot keep stock.
    await client.query(
      `DELETE FROM product_variants v USING products p
       WHERE v.product_id = p.id AND p.id = $1
         AND (NOT (v.size = ANY(p.sizes)) OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p.colors) c WHERE c->>'name' = v.color))`,
      [id],
    );
  });
  return (await getProduct(id)) ?? undefined;
};

export const deleteProduct = async (id: string) => (await pool.query("DELETE FROM products WHERE id = $1", [id])).rowCount === 1;

export const productExists = async (id: string) => Boolean(await one("SELECT 1 FROM products WHERE id = $1", [id]));
export const categoryInUse = async (slugs: string[]) =>
  one<{ category: string; name: string }>("SELECT category, name FROM products WHERE NOT (category = ANY($1)) LIMIT 1", [slugs]);
/** Color/size combinations that are sold out or nearly sold out. */
export const lowStock = () =>
  rows<{ id: string; name: string; variant: string; stock: number }>(
    `SELECT p.id, p.name, v.color || ' / ' || v.size AS variant, v.stock
     FROM product_variants v JOIN products p ON p.id = v.product_id
     WHERE v.stock <= 2 ORDER BY v.stock, p.name LIMIT 30`,
  );
export const countProducts = async () => (await one<{ n: number }>("SELECT COUNT(*) AS n FROM products"))!.n;
