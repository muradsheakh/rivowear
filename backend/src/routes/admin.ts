import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { OrderError, applyStatus, changeStatus, mutateOrder } from "../lib/orders.js";
import { syncCourierStatuses } from "../lib/courierSync.js";
import { imageUpload, uploadUrl } from "../lib/upload.js";
import { csvCell } from "../lib/util.js";
import { adminOnly, auth, param } from "../middleware.js";
import {
  adminReviews, deleteCoupon, deleteReview, getSettings, insertCoupon, listCoupons, recentNotifications, saveSettings, setCouponActive, setReviewHidden,
} from "../repo/misc.js";
import { dashboard, getOrderById, listAdminOrders, listAllOrders } from "../repo/orders.js";
import { categoryInUse, countProducts, deleteProduct, getProduct, insertProduct, lowStock, productExists, updateProduct } from "../repo/products.js";
import { listCustomers } from "../repo/users.js";
import { discardDead, listDead, outboxCounts } from "../repo/outbox.js";
import { notifyStatus } from "../services/notify.js";
import { retryDeadMessage } from "../services/outbox.js";
import { availableCouriers, defaultCourier, getCourier, type ParcelInput } from "../services/couriers/index.js";
import type { Order, PaymentStatus, Product, Variant } from "../types.js";

const router = Router();
router.use(auth, adminOnly);

const withCustomer = (order: Order) => ({ ...order, customer: order.shipping.fullName });
const firstIssue = (error: z.ZodError) => error.issues[0]?.message ?? "Invalid request.";
const statuses = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Returned"] as const;

const orderError = (response: import("express").Response, error: unknown) => {
  if (error instanceof OrderError) {
    response.status(error.status).json({ message: error.message });
    return;
  }
  throw error;
};

/* ------------------------------ Dashboard ------------------------------ */

router.get("/summary", async (_request, response) => {
  const { totals, statusCounts, salesByDay, topProducts, customers, recent } = await dashboard();
  const counts = new Map(statusCounts.map((row: { status: string; count: number }) => [row.status, row.count]));
  response.json({
    revenue: Math.round(totals.revenue),
    orders: totals.orders,
    todayOrders: totals.today,
    products: await countProducts(),
    customers,
    pendingOrders: totals.pending,
    paymentsToVerify: totals.to_verify,
    statusCounts: statuses.map((status) => ({ status, count: counts.get(status) ?? 0 })),
    salesByDay: salesByDay.map((row: { date: string; orders: number; revenue: number }) => ({ date: row.date, orders: row.orders, revenue: Math.round(row.revenue) })),
    topProducts: topProducts.map((row: { id: string; name: string; quantity: number; revenue: number }) => ({ ...row, revenue: Math.round(row.revenue) })),
    lowStock: await lowStock(),
    recentOrders: recent.map(withCustomer),
  });
});

/* ------------------------------- Orders -------------------------------- */

router.get("/orders", async (request, response) => {
  const { q, status, payment } = request.query as Record<string, string | undefined>;
  const result = await listAdminOrders({ q: q?.trim() || undefined, status: status || undefined, payment: payment || undefined });
  response.json({ orders: result.map(withCustomer) });
});

router.get("/orders/export.csv", async (_request, response) => {
  const header = ["Invoice", "Tracking ID", "Date", "Customer", "Phone", "Address", "City", "Items", "Subtotal", "Delivery", "Discount", "Total", "Payment", "Payment status", "Status", "Courier code"];
  const rows = (await listAllOrders()).map((order) =>
    [
      order.id, order.trackingId, order.createdAt, order.shipping.fullName, order.shipping.phone, order.shipping.address, order.shipping.city,
      order.items.map((item) => `${item.quantity}x ${item.name} (${item.size}/${item.color})`).join("; "),
      order.subtotal, order.shippingFee, order.discount, order.total, order.paymentMethod, order.paymentStatus, order.status, order.courier?.trackingCode ?? "",
    ].map(csvCell).join(","),
  );
  response.type("text/csv").send([header.map(csvCell).join(","), ...rows].join("\n"));
});

/** Creates the parcel at the chosen courier (default: DEFAULT_COURIER), then records it on the order. */
const sendToCourier = async (orderId: string, providerId?: string, input: ParcelInput = {}): Promise<Order> => {
  const courier = providerId ? getCourier(providerId) : defaultCourier();
  if (!courier || !courier.configured()) throw new OrderError("That courier is not set up. Pick another one.", 400);
  const before = await getOrderById(orderId);
  if (!before) throw new OrderError("Order not found.", 404);
  const check = (order: Order) => {
    if (order.courier) throw new OrderError("This order was already sent to the courier.", 409);
    if (order.status !== "Pending" && order.status !== "Processing") throw new OrderError(`A ${order.status.toLowerCase()} order cannot be sent to the courier.`, 409);
    if (order.paymentMethod !== "cod" && order.paymentStatus !== "paid") throw new OrderError("Confirm the payment before sending a prepaid order to the courier.", 409);
  };
  check(before);
  const parcel = await courier.createParcel(before, input);
  const saved = await mutateOrder(orderId, async (order, client) => {
    check(order); // somebody else may have sent it while we were talking to the courier
    const name = courier.manual ? (input.courierName?.trim() ?? courier.label) : courier.label;
    order.courier = { provider: courier.id, name, consignmentId: parcel.consignmentId, trackingCode: parcel.trackingCode, status: parcel.status, sentAt: new Date().toISOString(), mock: parcel.mock };
    await applyStatus(client, order, "Shipped", `Handed to ${name} (${parcel.trackingCode})`);
  });
  void notifyStatus(saved);
  return saved;
};

// Which couriers can be picked (the page shows a drop-down when there is more than one).
router.get("/couriers", (_request, response) => {
  response.json({
    couriers: availableCouriers().map((courier) => ({ id: courier.id, label: courier.label, manual: Boolean(courier.manual) })),
    default: defaultCourier().id,
  });
});

router.post("/orders/courier/bulk", async (request, response) => {
  const parsed = z.object({ ids: z.array(z.string()).min(1).max(100), provider: z.string().max(40).optional() }).safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Select at least one order." });
    return;
  }
  const results: { id: string; ok: boolean; message: string }[] = [];
  for (const id of parsed.data.ids) {
    try {
      const order = await sendToCourier(id, parsed.data.provider);
      results.push({ id, ok: true, message: `Sent (${order.courier?.trackingCode})` });
    } catch (error) {
      results.push({ id, ok: false, message: error instanceof Error ? error.message : "Failed" });
    }
  }
  response.json({ results });
});

router.post("/orders/sync-courier", async (_request, response) => {
  response.json({ updated: await syncCourierStatuses() });
});

router.get("/orders/:id", async (request, response) => {
  const order = await getOrderById(param(request, "id"));
  if (!order) {
    response.status(404).json({ message: "Order not found." });
    return;
  }
  response.json({ order: withCustomer(order), settings: await getSettings() });
});

const courierBody = z.object({
  provider: z.string().max(40).optional(),
  courierName: z.string().trim().max(60).optional(),
  trackingCode: z.string().trim().max(80).optional(),
});

router.post("/orders/:id/courier", async (request, response) => {
  const body = courierBody.safeParse(request.body ?? {});
  if (!body.success) {
    response.status(400).json({ message: "Invalid courier details." });
    return;
  }
  try {
    response.json({ order: withCustomer(await sendToCourier(param(request, "id"), body.data.provider, body.data)) });
  } catch (error) {
    if (error instanceof OrderError) response.status(error.status).json({ message: error.message });
    else response.status(502).json({ message: error instanceof Error ? error.message : "Courier request failed." });
  }
});

router.patch("/orders/:id/status", async (request, response) => {
  const parsed = z.object({ status: z.enum(statuses), note: z.string().trim().max(200).optional() }).safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Invalid status." });
    return;
  }
  try {
    response.json({ order: withCustomer(await changeStatus(param(request, "id"), parsed.data.status, parsed.data.note)) });
  } catch (error) {
    orderError(response, error);
  }
});

router.patch("/orders/:id/payment", async (request, response) => {
  const parsed = z.object({ paymentStatus: z.enum(["unpaid", "pending_verification", "paid", "failed", "refunded"]) }).safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Invalid payment status." });
    return;
  }
  const next = parsed.data.paymentStatus as PaymentStatus;
  try {
    const order = await mutateOrder(param(request, "id"), (current) => {
      current.paymentStatus = next;
      if (next === "paid") current.payment = { ...current.payment, paidAt: new Date().toISOString() };
      current.history.push({ status: current.status, note: `Payment marked ${next.replace("_", " ")}`, at: new Date().toISOString() });
    });
    response.json({ order: withCustomer(order) });
  } catch (error) {
    orderError(response, error);
  }
});

/* ------------------------------ Customers ------------------------------ */

router.get("/customers", async (_request, response) => {
  response.json({ customers: await listCustomers() });
});

/* ------------------------------- Products ------------------------------ */

const colorSchema = z.object({
  name: z.string().trim().min(1).max(40),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color code must look like #1a2b3c."),
  images: z.array(z.string().trim().url()).min(1, "Each color needs at least one photo.").max(8),
});

const productSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(3000).default(""),
  price: z.number().positive().max(10_000_000),
  image: z.string().trim().url().optional(),
  category: z.string().trim().min(1),
  gender: z.enum(["men", "women", "unisex"]),
  brand: z.string().trim().max(60).default("Rivowear"),
  material: z.string().trim().max(60).default(""),
  sizes: z.array(z.string().trim().min(1).max(10)).min(1).default(["S", "M", "L", "XL"]),
  colors: z.array(colorSchema).min(1, "Add at least one color.").max(20),
  variants: z.array(z.object({ color: z.string().trim().min(1).max(40), size: z.string().trim().min(1).max(10), stock: z.number().int().nonnegative().max(1_000_000) })).max(2000).default([]),
  isNewArrival: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
});

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");


const validateProduct = async (data: Partial<z.infer<typeof productSchema>>, current?: { colors: string[]; sizes: string[] }): Promise<string | null> => {
  if (data.category && !(await getSettings()).categories.some((category) => category.slug === data.category)) return "Unknown category.";
  if (data.colors) {
    const names = data.colors.map((color) => color.name.toLowerCase());
    if (new Set(names).size !== names.length) return "Two colors have the same name.";
  }
  if (data.sizes && new Set(data.sizes).size !== data.sizes.length) return "Two sizes have the same name.";
  if (data.variants) {
    const colors = new Set(data.colors?.map((color) => color.name) ?? current?.colors ?? []);
    const sizes = new Set(data.sizes ?? current?.sizes ?? []);
    for (const variant of data.variants) {
      if (!colors.has(variant.color)) return `Stock was given for the color "${variant.color}", which this product does not have.`;
      if (!sizes.has(variant.size)) return `Stock was given for the size "${variant.size}", which this product does not have.`;
    }
    const keys = data.variants.map((variant) => `${variant.color}|${variant.size}`);
    if (new Set(keys).size !== keys.length) return "The same color and size appears twice in the stock list.";
  }
  return null;
};

/** One row for every color and size; anything not listed has 0 stock. */
const fullMatrix = (colors: string[], sizes: string[], given: Variant[]): Variant[] => {
  const stock = new Map(given.map((variant) => [`${variant.color}|${variant.size}`, variant.stock]));
  return colors.flatMap((color) => sizes.map((size) => ({ color, size, stock: stock.get(`${color}|${size}`) ?? 0 })));
};

router.post("/products", async (request, response) => {
  const parsed = productSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: firstIssue(parsed.error) });
    return;
  }
  const problem = await validateProduct(parsed.data);
  if (problem) {
    response.status(400).json({ message: problem });
    return;
  }
  let id = slugify(parsed.data.name) || randomUUID();
  if (await productExists(id)) id = `${id}-${randomUUID().slice(0, 6)}`;
  const variants = fullMatrix(parsed.data.colors.map((color) => color.name), parsed.data.sizes, parsed.data.variants);
  const product: Product = {
    ...parsed.data,
    id,
    variants,
    stock: variants.reduce((sum, variant) => sum + variant.stock, 0),
    image: parsed.data.image ?? parsed.data.colors[0]?.images[0] ?? "",
    createdAt: new Date().toISOString(),
  };
  await insertProduct(product);
  response.status(201).json({ product });
});

router.put("/products/:id", async (request, response) => {
  const existing = await getProduct(param(request, "id"));
  if (!existing) {
    response.status(404).json({ message: "Product not found." });
    return;
  }
  const parsed = productSchema.partial().safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: firstIssue(parsed.error) });
    return;
  }
  const problem = await validateProduct(parsed.data, { colors: existing.colors.map((color) => color.name), sizes: existing.sizes });
  if (problem) {
    response.status(400).json({ message: problem });
    return;
  }
  const patch: Record<string, unknown> = { ...parsed.data };
  // When the form sends stock, rebuild the whole color x size grid from it.
  if (parsed.data.variants) {
    patch.variants = fullMatrix(parsed.data.colors?.map((color) => color.name) ?? existing.colors.map((color) => color.name), parsed.data.sizes ?? existing.sizes, parsed.data.variants);
  }
  if (!parsed.data.image && parsed.data.colors && !parsed.data.colors.some((color) => color.images.includes(existing.image))) {
    patch.image = parsed.data.colors[0]?.images[0] ?? existing.image;
  }
  response.json({ product: await updateProduct(existing.id, patch) });
});

router.delete("/products/:id", async (request, response) => {
  if (!(await deleteProduct(param(request, "id")))) {
    response.status(404).json({ message: "Product not found." });
    return;
  }
  response.status(204).send();
});

router.post("/uploads", imageUpload.array("images", 8), (request, response) => {
  const files = (request.files as Express.Multer.File[] | undefined) ?? [];
  response.status(201).json({ urls: files.map((file) => uploadUrl(file.filename)) });
});

/* ------------------------------- Reviews ------------------------------- */

router.get("/reviews", async (_request, response) => {
  response.json({ reviews: await adminReviews() });
});

router.patch("/reviews/:id", async (request, response) => {
  const parsed = z.object({ hidden: z.boolean() }).safeParse(request.body);
  const review = parsed.success ? await setReviewHidden(param(request, "id"), parsed.data.hidden) : undefined;
  if (!review) {
    response.status(parsed.success ? 404 : 400).json({ message: "Review not found." });
    return;
  }
  response.json({ review });
});

router.delete("/reviews/:id", async (request, response) => {
  if (!(await deleteReview(param(request, "id")))) {
    response.status(404).json({ message: "Review not found." });
    return;
  }
  response.status(204).send();
});

/* ------------------------------- Coupons ------------------------------- */

const couponSchema = z.object({
  code: z.string().trim().min(3).max(30).regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, - or _ only."),
  type: z.enum(["percent", "fixed"]),
  value: z.number().positive().max(1_000_000),
  minSubtotal: z.number().nonnegative().default(0),
  expiresAt: z.string().optional(),
  usageLimit: z.number().int().positive().optional(),
  active: z.boolean().default(true),
});

router.get("/coupons", async (_request, response) => {
  response.json({ coupons: await listCoupons() });
});

router.post("/coupons", async (request, response) => {
  const parsed = couponSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: firstIssue(parsed.error) });
    return;
  }
  if (parsed.data.type === "percent" && parsed.data.value > 100) {
    response.status(400).json({ message: "A percentage cannot be more than 100." });
    return;
  }
  try {
    response.status(201).json({ coupon: await insertCoupon(parsed.data) });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      response.status(409).json({ message: "This coupon code already exists." });
      return;
    }
    throw error;
  }
});

router.patch("/coupons/:code", async (request, response) => {
  const parsed = z.object({ active: z.boolean() }).safeParse(request.body);
  const coupon = parsed.success ? await setCouponActive(param(request, "code"), parsed.data.active) : undefined;
  if (!coupon) {
    response.status(parsed.success ? 404 : 400).json({ message: "Coupon not found." });
    return;
  }
  response.json({ coupon });
});

router.delete("/coupons/:code", async (request, response) => {
  if (!(await deleteCoupon(param(request, "code")))) {
    response.status(404).json({ message: "Coupon not found." });
    return;
  }
  response.status(204).send();
});

/* ------------------------------- Settings ------------------------------ */

const settingsSchema = z.object({
  storeName: z.string().trim().min(1).max(60),
  phone: z.string().trim().max(30),
  email: z.string().trim().max(120),
  address: z.string().trim().max(250),
  whatsappNumber: z.string().trim().regex(/^\d{10,15}$/, "WhatsApp number must be digits only with country code, e.g. 8801700000000.").or(z.literal("")),
  categories: z.array(z.object({ slug: z.string().regex(/^[a-z0-9-]+$/), label: z.string().trim().min(1).max(40) })).min(1),
  shipping: z.object({ insideDhaka: z.number().nonnegative(), outsideDhaka: z.number().nonnegative(), freeOver: z.number().nonnegative() }),
  payments: z.object({
    cod: z.boolean(),
    sslcommerz: z.boolean(),
    bkash: z.object({ enabled: z.boolean(), number: z.string().trim().max(20) }),
    nagad: z.object({ enabled: z.boolean(), number: z.string().trim().max(20) }),
  }),
  invoiceNote: z.string().trim().max(300),
  sms: z.object({ orderConfirmation: z.boolean(), statusUpdates: z.boolean() }),
});

router.put("/settings", async (request, response) => {
  const parsed = settingsSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: firstIssue(parsed.error) });
    return;
  }
  const slugs = new Set(parsed.data.categories.map((category) => category.slug));
  const orphan = await categoryInUse([...slugs]);
  if (orphan) {
    response.status(400).json({ message: `The category "${orphan.category}" is still used by ${orphan.name}. Move the products first.` });
    return;
  }
  await saveSettings(parsed.data);
  response.json({ settings: parsed.data });
});

router.get("/notifications", async (_request, response) => {
  response.json({ notifications: await recentNotifications() });
});

/* ------------------------- Failed messages (outbox) ------------------------- */

// SMS/emails that failed all their automatic tries. The admin can retry (fresh set of tries) or discard each one.
router.get("/outbox/failed", async (_request, response) => {
  response.json({ messages: await listDead(), counts: await outboxCounts() });
});

router.post("/outbox/:id/retry", async (request, response) => {
  if (!(await retryDeadMessage(param(request, "id")))) {
    response.status(404).json({ message: "This message was already retried or removed." });
    return;
  }
  response.json({ ok: true });
});

router.delete("/outbox/:id", async (request, response) => {
  if (!(await discardDead(param(request, "id")))) {
    response.status(404).json({ message: "This message was already retried or removed." });
    return;
  }
  response.status(204).end();
});

export default router;
