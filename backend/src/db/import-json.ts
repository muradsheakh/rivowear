import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { migrate } from "./migrate.js";
import { pool, tx } from "./pool.js";
import { defaultSettings } from "./seed.js";
import { makeTrackingId } from "../lib/util.js";

/**
 * One-time import of the old JSON data file into PostgreSQL.
 *   npm run import-json -- path/to/db.json
 * Run it on an EMPTY database (right after the first start, before real orders arrive).
 */
const file = resolve(process.argv[2] ?? process.env.DATA_FILE ?? "data/db.json");
if (!existsSync(file)) {
  console.error(`File not found: ${file}`);
  process.exit(1);
}

const data = JSON.parse(readFileSync(file, "utf8")) as Record<string, any>;
await migrate();

await tx(async (client) => {
  const existing = (await client.query("SELECT COUNT(*)::int AS n FROM orders")).rows[0].n as number;
  if (existing > 0) throw new Error("The database already has orders. Import only into an empty database.");

  await client.query("DELETE FROM users");
  await client.query("DELETE FROM products");

  for (const user of data.users ?? []) {
    await client.query("INSERT INTO users (id, name, contact, role, password_hash, created_at) VALUES ($1,$2,$3,$4,$5,$6)", [user.id, user.name, user.contact, user.role, user.passwordHash, user.createdAt]);
  }
  for (const p of data.products ?? []) {
    await client.query(
      `INSERT INTO products (id,name,description,price,image,category,gender,brand,material,sizes,colors,is_new_arrival,is_best_seller,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [p.id, p.name, p.description, p.price, p.image, p.category, p.gender, p.brand, p.material, p.sizes, JSON.stringify(p.colors), p.isNewArrival, p.isBestSeller, p.createdAt],
    );
    // Old files only had one stock number per product: share it evenly over the color/size combinations.
    const combos: { color: string; size: string }[] = (p.colors ?? []).flatMap((c: { name: string }) => (p.sizes ?? []).map((size: string) => ({ color: c.name, size })));
    const total = Math.max(1, combos.length);
    const base = Math.floor((p.stock ?? 0) / total);
    const extra = (p.stock ?? 0) % total;
    for (const [index, combo] of combos.entries()) {
      await client.query("INSERT INTO product_variants (product_id, color, size, stock) VALUES ($1,$2,$3,$4)", [p.id, combo.color, combo.size, base + (index === 0 ? extra : 0)]);
    }
  }
  let maxNumber = 1000;
  for (const o of data.orders ?? []) {
    maxNumber = Math.max(maxNumber, Number(String(o.id).replace(/\D/g, "")) || 0);
    await client.query(
      `INSERT INTO orders (id,tracking_id,user_id,items,shipping,payment_method,payment_status,payment,subtotal,shipping_fee,discount,coupon_code,total,status,courier,history,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [o.id, o.trackingId ?? makeTrackingId(), o.userId ?? null, JSON.stringify(o.items), JSON.stringify(o.shipping), o.paymentMethod ?? "cod", o.paymentStatus ?? "unpaid",
       o.payment ? JSON.stringify(o.payment) : null, o.subtotal ?? o.total, o.shippingFee ?? 0, o.discount ?? 0, o.couponCode ?? null, o.total, o.status,
       o.courier ? JSON.stringify(o.courier) : null, JSON.stringify(o.history ?? [{ status: o.status, note: "Order placed", at: o.createdAt }]), o.createdAt],
    );
  }
  await client.query("SELECT setval('order_seq', $1)", [maxNumber]);
  for (const r of data.reviews ?? []) {
    await client.query(
      "INSERT INTO reviews (id,product_id,user_id,user_name,order_id,rating,comment,images,hidden,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [r.id, r.productId, r.userId, r.userName, r.orderId, r.rating, r.comment, r.images ?? [], r.hidden ?? false, r.createdAt],
    );
  }
  for (const c of data.coupons ?? []) {
    await client.query("INSERT INTO coupons (code,type,value,min_subtotal,expires_at,usage_limit,used,active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [String(c.code).toUpperCase(), c.type, c.value, c.minSubtotal ?? 0, c.expiresAt ?? null, c.usageLimit ?? null, c.used ?? 0, c.active ?? true]);
  }
  for (const [userId, ids] of Object.entries<string[]>(data.wishlists ?? {})) {
    for (const productId of ids) await client.query("INSERT INTO wishlists (user_id, product_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [userId, productId]);
  }
  for (const [userId, items] of Object.entries<any[]>(data.carts ?? {})) {
    await client.query("INSERT INTO carts (user_id, items) VALUES ($1,$2) ON CONFLICT DO NOTHING", [userId, JSON.stringify(items)]);
  }
  await client.query("INSERT INTO settings (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data", [JSON.stringify({ ...defaultSettings(), ...(data.settings ?? {}) })]);
});

console.log(`Imported ${data.users?.length ?? 0} users, ${data.products?.length ?? 0} products, ${data.orders?.length ?? 0} orders, ${data.reviews?.length ?? 0} reviews.`);
await pool.end();
