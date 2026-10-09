import { one, rows, pool, type Db } from "../db/pool.js";
import type { CartItem, Coupon, NotificationLog, Review, Settings } from "../types.js";

/* ------------------------------- Settings ------------------------------ */

let cache: { value: Settings; at: number } | null = null;

export const getSettings = async (): Promise<Settings> => {
  if (cache && Date.now() - cache.at < 20_000) return cache.value;
  const row = await one<{ data: Settings }>("SELECT data FROM settings WHERE id = 1");
  if (!row) throw new Error("Settings are missing. Did the database seed run?");
  cache = { value: row.data, at: Date.now() };
  return row.data;
};

export const saveSettings = async (settings: Settings, db: Db = pool) => {
  await db.query(
    "INSERT INTO settings (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data",
    [JSON.stringify(settings)],
  );
  cache = { value: settings, at: Date.now() };
};

export const settingsExist = async () => Boolean(await one("SELECT 1 FROM settings WHERE id = 1"));

/* ---------------------------------- Cart -------------------------------- */

export const getCart = async (userId: string): Promise<CartItem[]> =>
  (await one<{ items: CartItem[] }>("SELECT items FROM carts WHERE user_id = $1", [userId]))?.items ?? [];

export const saveCart = async (userId: string, items: CartItem[]) => {
  await pool.query(
    "INSERT INTO carts (user_id, items) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET items = EXCLUDED.items, updated_at = now()",
    [userId, JSON.stringify(items)],
  );
};

export const clearCart = async (userId: string, db: Db = pool) => {
  await db.query("DELETE FROM carts WHERE user_id = $1", [userId]);
};

/* -------------------------------- Wishlist ------------------------------ */

export const wishlistIds = async (userId: string) =>
  (await rows<{ product_id: string }>("SELECT product_id FROM wishlists WHERE user_id = $1 ORDER BY added_at DESC", [userId])).map((row) => row.product_id);

export const addWishlist = async (userId: string, productId: string) => {
  await pool.query("INSERT INTO wishlists (user_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [userId, productId]);
};

export const removeWishlist = async (userId: string, productId: string) => {
  await pool.query("DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2", [userId, productId]);
};

/* -------------------------------- Reviews ------------------------------- */

const toReview = (row: any): Review => ({
  id: row.id,
  productId: row.product_id,
  userId: row.user_id,
  userName: row.user_name,
  orderId: row.order_id,
  rating: row.rating,
  comment: row.comment,
  images: row.images,
  hidden: row.hidden,
  createdAt: row.created_at.toISOString(),
});

export const visibleReviews = async (productId: string) =>
  (await rows("SELECT * FROM reviews WHERE product_id = $1 AND NOT hidden ORDER BY created_at DESC", [productId])).map(toReview);

export const hasReviewed = async (userId: string, productId: string) =>
  Boolean(await one("SELECT 1 FROM reviews WHERE user_id = $1 AND product_id = $2", [userId, productId]));

export const insertReview = async (review: Omit<Review, "id" | "createdAt" | "hidden">): Promise<Review> =>
  toReview((await one(
    `INSERT INTO reviews (product_id, user_id, user_name, order_id, rating, comment, images) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [review.productId, review.userId, review.userName, review.orderId, review.rating, review.comment, review.images],
  ))!);

export const deleteOwnReview = async (id: string, userId: string) =>
  (await pool.query("DELETE FROM reviews WHERE id = $1 AND user_id = $2", [id, userId])).rowCount === 1;

export const myReviews = async (userId: string) =>
  (await rows(
    `SELECT r.*, p.name AS product_name, p.image AS product_image FROM reviews r LEFT JOIN products p ON p.id = r.product_id
     WHERE r.user_id = $1 ORDER BY r.created_at DESC`,
    [userId],
  )).map((row) => ({ ...toReview(row), productName: (row.product_name as string | null) ?? "Deleted product", productImage: (row.product_image as string | null) ?? "" }));

export const updateOwnReview = async (id: string, userId: string, rating: number, comment: string) => {
  const row = await one("UPDATE reviews SET rating = $3, comment = $4 WHERE id = $1 AND user_id = $2 RETURNING *", [id, userId, rating, comment]);
  return row ? toReview(row) : undefined;
};

export const adminReviews = async () =>
  (await rows(`SELECT r.*, COALESCE(p.name, 'Deleted product') AS product_name FROM reviews r LEFT JOIN products p ON p.id = r.product_id ORDER BY r.created_at DESC`))
    .map((row) => ({ ...toReview(row), productName: row.product_name as string }));

export const setReviewHidden = async (id: string, hidden: boolean) => {
  const row = await one("UPDATE reviews SET hidden = $2 WHERE id = $1 RETURNING *", [id, hidden]);
  return row ? toReview(row) : undefined;
};

export const deleteReview = async (id: string) => (await pool.query("DELETE FROM reviews WHERE id = $1", [id])).rowCount === 1;

/* -------------------------------- Coupons ------------------------------- */

const toCoupon = (row: any): Coupon => ({
  code: row.code,
  type: row.type,
  value: row.value,
  minSubtotal: row.min_subtotal,
  expiresAt: row.expires_at ? row.expires_at.toISOString() : undefined,
  usageLimit: row.usage_limit ?? undefined,
  used: row.used,
  active: row.active,
});

export const listCoupons = async () => (await rows("SELECT * FROM coupons ORDER BY code")).map(toCoupon);

export const findCoupon = async (code: string, db: Db = pool, lock = false) => {
  const row = await one(`SELECT * FROM coupons WHERE code = $1 ${lock ? "FOR UPDATE" : ""}`, [code.trim().toUpperCase()], db);
  return row ? toCoupon(row) : undefined;
};

export const insertCoupon = async (coupon: Omit<Coupon, "used">) =>
  toCoupon((await one(
    "INSERT INTO coupons (code, type, value, min_subtotal, expires_at, usage_limit, active) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
    [coupon.code.toUpperCase(), coupon.type, coupon.value, coupon.minSubtotal, coupon.expiresAt ?? null, coupon.usageLimit ?? null, coupon.active],
  ))!);

export const setCouponActive = async (code: string, active: boolean) => {
  const row = await one("UPDATE coupons SET active = $2 WHERE code = $1 RETURNING *", [code.toUpperCase(), active]);
  return row ? toCoupon(row) : undefined;
};

export const deleteCoupon = async (code: string) => (await pool.query("DELETE FROM coupons WHERE code = $1", [code.toUpperCase()])).rowCount === 1;

export const adjustCouponUsage = async (code: string, delta: number, db: Db = pool) => {
  await db.query("UPDATE coupons SET used = GREATEST(0, used + $2) WHERE code = $1", [code.toUpperCase(), delta]);
};

/* ----------------------------- Notifications ---------------------------- */

export const logNotification = async (channel: "sms" | "email", to: string, message: string, ok: boolean, detail: string) => {
  await pool.query("INSERT INTO notifications (channel, recipient, message, ok, detail) VALUES ($1,$2,$3,$4,$5)", [channel, to, message, ok, detail]);
  // Keep the log short.
  await pool.query("DELETE FROM notifications WHERE at < now() - interval '60 days'");
};

export const recentNotifications = async (): Promise<NotificationLog[]> =>
  (await rows("SELECT * FROM notifications ORDER BY at DESC LIMIT 100")).map((row) => ({
    id: row.id, channel: row.channel, to: row.recipient, message: row.message, ok: row.ok, detail: row.detail, at: row.at.toISOString(),
  }));
