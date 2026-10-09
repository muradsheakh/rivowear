import { randomUUID } from "node:crypto";
import { pool, tx, type Client } from "../db/pool.js";
import { adjustCouponUsage, clearCart, findCoupon, getSettings } from "../repo/misc.js";
import { insertOrder, lockOrderById, saveOrder } from "../repo/orders.js";
import { loadProducts } from "../repo/products.js";
import { notifyStatus } from "../services/notify.js";
import { getCourier } from "../services/couriers/index.js";
import type { CartItem, Coupon, Order, OrderItem, OrderStatus, PaymentMethod, Product, Settings, ShippingInfo } from "../types.js";
import { publish } from "./realtime.js";
import { makeTrackingId, round2 } from "./util.js";

export class OrderError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export const checkCoupon = (coupon: Coupon | undefined, subtotal: number): { coupon: Coupon; discount: number } => {
  if (!coupon || !coupon.active) throw new OrderError("This coupon code is not valid.");
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) throw new OrderError("This coupon has expired.");
  if (coupon.usageLimit !== undefined && coupon.used >= coupon.usageLimit) throw new OrderError("This coupon has been fully used.");
  if (subtotal < coupon.minSubtotal) throw new OrderError(`Spend at least ৳${coupon.minSubtotal} to use this coupon.`);
  const raw = coupon.type === "percent" ? (subtotal * coupon.value) / 100 : coupon.value;
  return { coupon, discount: round2(Math.min(raw, subtotal)) };
};

export const shippingFeeFor = (settings: Settings, city: string, subtotal: number) => {
  const { insideDhaka, outsideDhaka, freeOver } = settings.shipping;
  if (freeOver > 0 && subtotal >= freeOver) return 0;
  return /dhaka/i.test(city) ? insideDhaka : outsideDhaka;
};

/** Prices always come from the database, never from the browser. */
export const priceItems = (items: CartItem[], products: Map<string, Product>): OrderItem[] => {
  if (items.length === 0) throw new OrderError("Your cart is empty.");
  const requested = new Map<string, { product: Product; color: string; size: string; quantity: number }>();

  const priced = items.map((item) => {
    const product = products.get(item.productId);
    if (!product) throw new OrderError("A product in your cart is no longer available.", 409);
    if (!product.sizes.includes(item.size)) throw new OrderError(`Size ${item.size} is not available for ${product.name}.`);
    const color = product.colors.find((candidate) => candidate.name === item.color);
    if (!color && !(product.colors.length === 0 && item.color === "Default")) {
      throw new OrderError(`Color ${item.color} is not available for ${product.name}.`);
    }
    const key = `${product.id}|${item.color}|${item.size}`;
    const entry = requested.get(key) ?? { product, color: item.color, size: item.size, quantity: 0 };
    entry.quantity += item.quantity;
    requested.set(key, entry);
    return { ...item, name: product.name, price: product.price, image: color?.images[0] ?? product.image };
  });

  // Stock is checked for the exact color and size, so a sold-out size never blocks the others.
  for (const { product, color, size, quantity } of requested.values()) {
    const available = product.variants.find((variant) => variant.color === color && variant.size === size)?.stock ?? 0;
    if (available < quantity) {
      const label = `${product.name} (${color}, size ${size})`;
      throw new OrderError(
        available === 0
          ? `${label} is out of stock. Please remove it from your cart.`
          : `Only ${available} left of ${label}. Please lower the quantity.`,
        409,
      );
    }
  }
  return priced;
};

const totalsFor = (priced: OrderItem[], settings: Settings, city: string, coupon: Coupon | undefined, couponCode?: string) => {
  const subtotal = round2(priced.reduce((sum, item) => sum + item.price * item.quantity, 0));
  const applied = couponCode ? checkCoupon(coupon, subtotal) : null;
  const discount = applied?.discount ?? 0;
  const shippingFee = shippingFeeFor(settings, city, subtotal - discount);
  return { subtotal, discount, shippingFee, total: round2(subtotal - discount + shippingFee), coupon: applied?.coupon };
};

export const quote = async (items: CartItem[], city: string, couponCode?: string) => {
  const products = await loadProducts(items.map((item) => item.productId));
  const priced = priceItems(items, products);
  const coupon = couponCode ? await findCoupon(couponCode) : undefined;
  return { priced, ...totalsFor(priced, await getSettings(), city, coupon, couponCode) };
};

export type PlaceOrderInput = {
  items: CartItem[];
  shipping: ShippingInfo;
  paymentMethod: PaymentMethod;
  couponCode?: string;
  manualPayment?: { trxId: string; senderNumber: string };
  userId: string | null;
};

/** Creates an order. Stock and coupon use are checked and changed inside one transaction, so two buyers can never oversell an item. */
export const placeOrder = (input: PlaceOrderInput): Promise<Order> => {
  const attempt = () =>
    tx(async (client) => {
      const products = await loadProducts(input.items.map((item) => item.productId), client, true);
      const settings = await getSettings();
      const coupon = input.couponCode ? await findCoupon(input.couponCode, client, true) : undefined;
      const priced = priceItems(input.items, products);
      const totals = totalsFor(priced, settings, input.shipping.city, coupon, input.couponCode);

      // Take the stock from the exact color and size. The "stock >= qty" guard means it can never go below zero.
      const perVariant = new Map<string, { productId: string; color: string; size: string; quantity: number }>();
      for (const item of priced) {
        const key = `${item.productId}|${item.color}|${item.size}`;
        const entry = perVariant.get(key) ?? { productId: item.productId, color: item.color, size: item.size, quantity: 0 };
        entry.quantity += item.quantity;
        perVariant.set(key, entry);
      }
      for (const { productId, color, size, quantity } of perVariant.values()) {
        const result = await client.query(
          "UPDATE product_variants SET stock = stock - $4 WHERE product_id = $1 AND color = $2 AND size = $3 AND stock >= $4",
          [productId, color, size, quantity],
        );
        if (result.rowCount !== 1) throw new OrderError("Some items just sold out. Please check your cart and try again.", 409);
      }
      if (totals.coupon) await adjustCouponUsage(totals.coupon.code, 1, client);

      const order = await insertOrder(client, {
        trackingId: makeTrackingId(),
        userId: input.userId,
        items: priced,
        shipping: input.shipping,
        paymentMethod: input.paymentMethod,
        paymentStatus: input.manualPayment ? "pending_verification" : "unpaid",
        payment: input.manualPayment ? { trxId: input.manualPayment.trxId.toUpperCase(), senderNumber: input.manualPayment.senderNumber } : undefined,
        subtotal: totals.subtotal,
        shippingFee: totals.shippingFee,
        discount: totals.discount,
        couponCode: totals.coupon?.code,
        total: totals.total,
        status: "Pending",
        history: [{ status: "Pending", note: "Order placed", at: new Date().toISOString() }],
      });
      if (input.userId) await clearCart(input.userId, client);
      return order;
    });

  return (async () => {
    for (let tries = 0; ; tries += 1) {
      try {
        return await attempt();
      } catch (error) {
        // A tracking ID clash is astronomically rare; just try again with a new one.
        if (tries < 3 && (error as { code?: string }).code === "23505") continue;
        throw error;
      }
    }
  })();
};

export const publicTracking = (order: Order) => ({
  trackingId: order.trackingId,
  orderId: order.id,
  status: order.status,
  paymentMethod: order.paymentMethod,
  paymentStatus: order.paymentStatus,
  total: order.total,
  city: order.shipping.city,
  createdAt: order.createdAt,
  items: order.items.map((item) => ({ name: item.name, image: item.image, size: item.size, color: item.color, quantity: item.quantity })),
  history: order.history,
  courier: order.courier
    ? {
        provider: order.courier.provider,
        name: order.courier.name ?? getCourier(order.courier.provider)?.label ?? "Courier",
        trackingCode: order.courier.trackingCode,
        trackUrl: order.courier.mock ? null : (getCourier(order.courier.provider)?.trackUrl?.(order.courier.trackingCode) ?? null),
      }
    : null,
});

export const pushUpdate = (order: Order) => void publish(order.trackingId, publicTracking(order));

const restoreStock = async (client: Client, order: Order) => {
  for (const item of order.items) {
    await client.query("UPDATE product_variants SET stock = stock + $4 WHERE product_id = $1 AND color = $2 AND size = $3", [item.productId, item.color, item.size, item.quantity]);
  }
  if (order.couponCode) await adjustCouponUsage(order.couponCode, -1, client);
};

/** Moves an order to a new status inside the caller's transaction (keeps stock, payment and history in step). */
export const applyStatus = async (client: Client, order: Order, status: OrderStatus, note = "") => {
  if (order.status === status) return;
  if (order.status === "Cancelled" || order.status === "Returned") throw new OrderError("Cancelled or returned orders cannot be reopened.", 409);

  if (status === "Cancelled" || status === "Returned") {
    await restoreStock(client, order);
    if (order.paymentStatus === "paid") order.paymentStatus = "refunded";
  }
  if (status === "Delivered" && order.paymentMethod === "cod" && order.paymentStatus !== "paid") {
    order.paymentStatus = "paid";
    order.payment = { ...order.payment, paidAt: new Date().toISOString() };
  }
  order.status = status;
  order.history.push({ status, note: note || status, at: new Date().toISOString() });
};

/**
 * Locks one order, lets fn change it, saves it, then tells the customer's live tracking page.
 * Two admins (or the courier sync and an admin) can never overwrite each other's change.
 */
export const mutateOrder = async (orderId: string, fn: (order: Order, client: Client) => Promise<void> | void): Promise<Order> => {
  const order = await tx(async (client) => {
    const locked = await lockOrderById(client, orderId);
    if (!locked) throw new OrderError("Order not found.", 404);
    await fn(locked, client);
    await saveOrder(client, locked);
    return locked;
  });
  pushUpdate(order);
  return order;
};

export const changeStatus = async (orderId: string, status: OrderStatus, note = "", options: { silent?: boolean } = {}): Promise<Order> => {
  let changed = false;
  const order = await mutateOrder(orderId, async (current, client) => {
    changed = current.status !== status;
    await applyStatus(client, current, status, note);
  });
  if (changed && !options.silent) void notifyStatus(order);
  return order;
};

export const newTranId = (orderId: string) => `${orderId}-${randomUUID().slice(0, 8)}`;
export { pool };
