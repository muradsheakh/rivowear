import { one, rows, pool, type Client, type Db } from "../db/pool.js";
import type { Order } from "../types.js";

const toOrder = (row: any): Order => ({
  id: row.id,
  trackingId: row.tracking_id,
  userId: row.user_id,
  items: row.items,
  shipping: row.shipping,
  paymentMethod: row.payment_method,
  paymentStatus: row.payment_status,
  payment: row.payment ?? undefined,
  subtotal: row.subtotal,
  shippingFee: row.shipping_fee,
  discount: row.discount,
  couponCode: row.coupon_code ?? undefined,
  total: row.total,
  status: row.status,
  courier: row.courier ?? undefined,
  history: row.history,
  createdAt: row.created_at.toISOString(),
});

export const insertOrder = async (client: Client, order: Omit<Order, "id" | "createdAt">): Promise<Order> =>
  toOrder(
    (await one(
      `INSERT INTO orders (id, tracking_id, user_id, items, shipping, payment_method, payment_status, payment, subtotal, shipping_fee, discount, coupon_code, total, status, courier, history)
       VALUES ('RW-' || nextval('order_seq'), $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [order.trackingId, order.userId, JSON.stringify(order.items), JSON.stringify(order.shipping), order.paymentMethod, order.paymentStatus,
       order.payment ? JSON.stringify(order.payment) : null, order.subtotal, order.shippingFee, order.discount, order.couponCode ?? null,
       order.total, order.status, order.courier ? JSON.stringify(order.courier) : null, JSON.stringify(order.history)],
      client,
    ))!,
  );

/** Saves the parts of an order that can change after it was placed. */
export const saveOrder = async (db: Db, order: Order) => {
  await db.query(
    "UPDATE orders SET status=$2, payment_status=$3, payment=$4, courier=$5, history=$6 WHERE id=$1",
    [order.id, order.status, order.paymentStatus, order.payment ? JSON.stringify(order.payment) : null, order.courier ? JSON.stringify(order.courier) : null, JSON.stringify(order.history)],
  );
};

export const lockOrderById = async (client: Client, id: string) => {
  const row = await one("SELECT * FROM orders WHERE id = $1 FOR UPDATE", [id], client);
  return row ? toOrder(row) : undefined;
};

export const getOrderById = async (id: string, db: Db = pool) => {
  const row = await one("SELECT * FROM orders WHERE id = $1", [id], db);
  return row ? toOrder(row) : undefined;
};

export const getOrderByTracking = async (trackingId: string) => {
  const row = await one("SELECT * FROM orders WHERE tracking_id = $1", [trackingId.toUpperCase()]);
  return row ? toOrder(row) : undefined;
};

export const getOrderByTran = async (tranId: string) => {
  const row = await one("SELECT * FROM orders WHERE payment->>'tranId' = $1", [tranId]);
  return row ? toOrder(row) : undefined;
};

export const getOrderByConsignment = async (consignmentId: string) => {
  const row = await one("SELECT * FROM orders WHERE courier->>'consignmentId' = $1", [consignmentId]);
  return row ? toOrder(row) : undefined;
};

export const listOrdersByUser = async (userId: string) =>
  (await rows("SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC", [userId])).map(toOrder);

export const listAdminOrders = async (filters: { q?: string; status?: string; payment?: string }) => {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filters.status) { params.push(filters.status); where.push(`status = $${params.length}`); }
  if (filters.payment) { params.push(filters.payment); where.push(`payment_status = $${params.length}`); }
  if (filters.q) {
    params.push(`%${filters.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    where.push(`(id || ' ' || tracking_id || ' ' || (shipping->>'fullName') || ' ' || (shipping->>'phone')) ILIKE $${params.length}`);
  }
  return (await rows(`SELECT * FROM orders ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY created_at DESC LIMIT 500`, params)).map(toOrder);
};

export const listAllOrders = async () => (await rows("SELECT * FROM orders ORDER BY created_at DESC")).map(toOrder);

export const listShippedWithCourier = async () =>
  (await rows("SELECT * FROM orders WHERE status = 'Shipped' AND courier IS NOT NULL AND COALESCE((courier->>'mock')::boolean, false) = false")).map(toOrder);

export const listStaleUnpaidOnlineOrders = async (hours: number) =>
  (await rows(
    `SELECT * FROM orders WHERE payment_method = 'sslcommerz' AND status = 'Pending' AND payment_status IN ('unpaid','failed')
     AND created_at < now() - ($1 || ' hours')::interval`, [String(hours)])).map(toOrder);

export const userHasPurchased = async (userId: string, productId: string, statuses: string[]) =>
  Boolean(await one(
    "SELECT 1 FROM orders WHERE user_id = $1 AND status = ANY($3) AND items @> $2::jsonb LIMIT 1",
    [userId, JSON.stringify([{ productId }]), statuses],
  ));

export const findPurchaseOrderId = async (userId: string, productId: string, statuses: string[]) =>
  (await one<{ id: string }>(
    "SELECT id FROM orders WHERE user_id = $1 AND status = ANY($3) AND items @> $2::jsonb ORDER BY created_at DESC LIMIT 1",
    [userId, JSON.stringify([{ productId }]), statuses],
  ))?.id;

export const dashboard = async () => {
  const live = "status NOT IN ('Cancelled','Returned')";
  const totals = (await one(`
    SELECT COUNT(*) AS orders,
           COALESCE(SUM(total) FILTER (WHERE ${live}), 0) AS revenue,
           COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now())) AS today,
           COUNT(*) FILTER (WHERE status = 'Pending') AS pending,
           COUNT(*) FILTER (WHERE payment_status = 'pending_verification' AND ${live}) AS to_verify
    FROM orders`))!;
  const statusCounts = await rows("SELECT status, COUNT(*) AS count FROM orders GROUP BY status");
  const salesByDay = await rows(`
    SELECT to_char(d, 'YYYY-MM-DD') AS date, COUNT(o.id) AS orders, COALESCE(SUM(o.total), 0) AS revenue
    FROM generate_series(current_date - 13, current_date, interval '1 day') d
    LEFT JOIN orders o ON o.created_at::date = d::date AND o.${live}
    GROUP BY d ORDER BY d`);
  const topProducts = await rows(`
    SELECT i->>'productId' AS id, (array_agg(i->>'name'))[1] AS name,
           SUM((i->>'quantity')::int) AS quantity, SUM((i->>'price')::numeric * (i->>'quantity')::int) AS revenue
    FROM orders o, jsonb_array_elements(o.items) i WHERE o.${live}
    GROUP BY i->>'productId' ORDER BY quantity DESC LIMIT 5`);
  const customers = (await one(`
    SELECT (SELECT COUNT(*) FROM users WHERE role = 'customer')
         + (SELECT COUNT(DISTINCT shipping->>'phone') FROM orders WHERE user_id IS NULL) AS n`))!.n;
  const recent = (await rows("SELECT * FROM orders ORDER BY created_at DESC LIMIT 8")).map(toOrder);
  return { totals, statusCounts, salesByDay, topProducts, customers, recent };
};

/** Attaches an earlier guest order to an account. The tracking ID and the order's phone number must both match. */
export const claimGuestOrder = async (userId: string, trackingId: string, phone: string): Promise<Order | "owned" | undefined> => {
  const row = await one(
    "UPDATE orders SET user_id = $2 WHERE tracking_id = $1 AND user_id IS NULL AND shipping->>'phone' = $3 RETURNING *",
    [trackingId.toUpperCase(), userId, phone],
  );
  if (row) return toOrder(row);
  const mine = await one("SELECT 1 FROM orders WHERE tracking_id = $1 AND user_id = $2", [trackingId.toUpperCase(), userId]);
  return mine ? "owned" : undefined;
};

export const accountStats = async (userId: string) =>
  (await one<{ orders: number; delivered: number; spent: number; reviews: number; wishlist: number; addresses: number }>(
    `SELECT (SELECT COUNT(*) FROM orders WHERE user_id = $1) AS orders,
            (SELECT COUNT(*) FROM orders WHERE user_id = $1 AND status = 'Delivered') AS delivered,
            (SELECT COALESCE(SUM(total), 0) FROM orders WHERE user_id = $1 AND status NOT IN ('Cancelled','Returned')) AS spent,
            (SELECT COUNT(*) FROM reviews WHERE user_id = $1) AS reviews,
            (SELECT COUNT(*) FROM wishlists WHERE user_id = $1) AS wishlist,
            (SELECT COUNT(*) FROM addresses WHERE user_id = $1) AS addresses`,
    [userId],
  ))!;
