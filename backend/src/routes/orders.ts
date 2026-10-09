import { Router, type Response } from "express";
import { z } from "zod";
import { OrderError, changeStatus, newTranId, placeOrder, publicTracking, quote } from "../lib/orders.js";
import { subscribe } from "../lib/realtime.js";
import { config } from "../config.js";
import { byPhone } from "../lib/accountKey.js";
import { normalizePhone } from "../lib/util.js";
import { auth, currentUser, optionalAuth, param, rateLimit } from "../middleware.js";
import { getSettings } from "../repo/misc.js";
import { issueOtp, verifyOtp } from "../repo/otp.js";
import { signPhoneProof, verifyPhoneProof } from "../security.js";
import { sendOtp } from "../services/otp.js";
import { getOrderById, getOrderByTracking, listOrdersByUser, saveOrder } from "../repo/orders.js";
import { pool } from "../db/pool.js";
import { notifyOrderPlaced } from "../services/notify.js";
import { gatewayAvailable, startGatewayPayment } from "../services/payments.js";
import type { PaymentMethod, User } from "../types.js";

const router = Router();

const itemSchema = z.object({
  productId: z.string().min(1),
  size: z.string().min(1).max(20),
  color: z.string().min(1).max(40),
  quantity: z.number().int().positive().max(99),
});

const quoteSchema = z.object({
  items: z.array(itemSchema).min(1).max(100),
  city: z.string().trim().max(80).default(""),
  couponCode: z.string().trim().max(40).optional(),
});

const orderSchema = z.object({
  items: z.array(itemSchema).min(1).max(100),
  shipping: z.object({
    fullName: z.string().trim().min(2, "Please enter your name.").max(80),
    phone: z.string().trim().min(1, "Please enter your phone number."),
    email: z.union([z.literal(""), z.string().trim().email("Please enter a valid email.")]).optional(),
    address: z.string().trim().min(5, "Please enter your full address.").max(200),
    city: z.string().trim().min(2, "Please enter your city.").max(80),
    postalCode: z.string().trim().max(20).optional(),
    note: z.string().trim().max(300).optional(),
  }),
  paymentMethod: z.enum(["cod", "sslcommerz", "bkash_manual", "nagad_manual"]),
  couponCode: z.string().trim().max(40).optional(),
  phoneProof: z.string().max(200).optional(),
  manualPayment: z
    .object({ trxId: z.string().trim().min(6).max(30), senderNumber: z.string().trim().min(6).max(20) })
    .optional(),
});

const fail = (response: Response, error: unknown) => {
  if (error instanceof OrderError) {
    response.status(error.status).json({ message: error.message });
    return;
  }
  throw error;
};

const methodEnabled = async (method: PaymentMethod) => {
  const { payments } = await getSettings();
  if (method === "cod") return payments.cod;
  if (method === "sslcommerz") return payments.sslcommerz && gatewayAvailable();
  if (method === "bkash_manual") return payments.bkash.enabled;
  return payments.nagad.enabled;
};

router.get("/checkout/options", async (_request, response) => {
  const { payments } = await getSettings();
  response.json({
    cod: payments.cod,
    online: payments.sslcommerz && gatewayAvailable(),
    bkash: payments.bkash.enabled ? { number: payments.bkash.number } : null,
    nagad: payments.nagad.enabled ? { number: payments.nagad.number } : null,
    phoneVerification: config.checkoutOtp,
  });
});

/* -------- Phone check for Cash on Delivery (cuts fake orders). Turned on with CHECKOUT_OTP=true. -------- */

const otpPhoneSchema = z.object({ phone: z.string().trim().min(1) });

router.post(
  "/checkout/otp/send",
  rateLimit(10, 15 * 60_000),
  // 3 codes per phone number per 15 minutes: nobody can use the shop to flood a stranger's phone or run up the SMS bill.
  rateLimit(3, 15 * 60_000, { name: "checkout/otp/send:phone", by: byPhone }),
  async (request, response) => {
    const parsed = otpPhoneSchema.safeParse(request.body);
    const phone = parsed.success ? normalizePhone(parsed.data.phone) : null;
    if (!config.checkoutOtp) {
      response.status(400).json({ message: "Phone verification is not needed right now." });
      return;
    }
    if (!phone) {
      response.status(400).json({ message: "Please enter a valid Bangladeshi mobile number (01XXXXXXXXX)." });
      return;
    }
    const code = await issueOtp("checkout", phone, null);
    if (!code) {
      response.status(429).json({ message: "A code was sent a moment ago. Please wait a minute before asking for another." });
      return;
    }
    if (!(await sendOtp("checkout", { phone }, code))) {
      response.status(502).json({ message: "We could not send the SMS. Please check the number and try again." });
      return;
    }
    response.json({ message: "We sent a 6-digit code to your phone." });
  },
);

router.post(
  "/checkout/otp/verify",
  rateLimit(20, 15 * 60_000),
  rateLimit(10, 15 * 60_000, { name: "checkout/otp/verify:phone", by: byPhone }),
  async (request, response) => {
    const parsed = z.object({ phone: z.string().trim().min(1), code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code.") }).safeParse(request.body);
    const phone = parsed.success ? normalizePhone(parsed.data.phone) : null;
    if (!parsed.success || !phone) {
      response.status(400).json({ message: parsed.success ? "Please enter a valid Bangladeshi mobile number (01XXXXXXXXX)." : (parsed.error.issues[0]?.message ?? "Invalid request.") });
      return;
    }
    const result = await verifyOtp("checkout", phone, parsed.data.code);
    if (!result.ok) {
      response.status(400).json({ message: "This code is wrong or has expired. Please request a new one." });
      return;
    }
    response.json({ phoneProof: signPhoneProof(phone) });
  },
);

router.post("/checkout/quote", async (request, response) => {
  const parsed = quoteSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Invalid cart." });
    return;
  }
  try {
    const result = await quote(parsed.data.items, parsed.data.city, parsed.data.couponCode || undefined);
    response.json({ subtotal: result.subtotal, discount: result.discount, shippingFee: result.shippingFee, total: result.total, couponCode: result.coupon?.code });
  } catch (error) {
    fail(response, error);
  }
});

router.post("/orders", rateLimit(30, 15 * 60_000), optionalAuth, async (request, response) => {
  const parsed = orderSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: parsed.error.issues[0]?.message ?? "Please complete all details." });
    return;
  }
  const input = parsed.data;
  const phone = normalizePhone(input.shipping.phone);
  if (!phone) {
    response.status(400).json({ message: "Please enter a valid Bangladeshi mobile number (01XXXXXXXXX)." });
    return;
  }
  if (!(await methodEnabled(input.paymentMethod))) {
    response.status(400).json({ message: "This payment method is not available right now." });
    return;
  }
  if (config.checkoutOtp && input.paymentMethod === "cod" && !(input.phoneProof && verifyPhoneProof(input.phoneProof, phone))) {
    response.status(400).json({ message: "Please confirm your mobile number with the SMS code to place a Cash on Delivery order." });
    return;
  }
  if ((input.paymentMethod === "bkash_manual" || input.paymentMethod === "nagad_manual") && !input.manualPayment) {
    response.status(400).json({ message: "Please enter the transaction ID of your payment." });
    return;
  }

  try {
    const user = response.locals.user as User | undefined;
    let order = await placeOrder({
      items: input.items,
      shipping: { ...input.shipping, phone, email: input.shipping.email || undefined },
      paymentMethod: input.paymentMethod,
      couponCode: input.couponCode || undefined,
      manualPayment: input.manualPayment,
      userId: user?.id ?? null,
    });

    let paymentUrl: string | undefined;
    if (order.paymentMethod === "sslcommerz") {
      try {
        const tranId = newTranId(order.id);
        order.payment = { tranId };
        await saveOrder(pool, order);
        paymentUrl = await startGatewayPayment(order, tranId);
      } catch (error) {
        // The gateway is down: undo the order so the customer can pick another method.
        order = await changeStatus(order.id, "Cancelled", "Online payment could not be started", { silent: true });
        response.status(502).json({ message: error instanceof Error ? error.message : "Online payment is unavailable." });
        return;
      }
    } else {
      void notifyOrderPlaced(order);
    }
    response.status(201).json({ order, paymentUrl });
  } catch (error) {
    fail(response, error);
  }
});

router.get("/orders", auth, async (_request, response) => {
  response.json({ orders: await listOrdersByUser(currentUser(response).id) });
});

router.get("/orders/:id", auth, async (request, response) => {
  const user = currentUser(response);
  const order = await getOrderById(param(request, "id"));
  if (!order || (order.userId !== user.id && user.role !== "admin")) {
    response.status(404).json({ message: "Order not found." });
    return;
  }
  response.json({ order });
});

router.post("/orders/:id/cancel", auth, async (request, response) => {
  const order = await getOrderById(param(request, "id"));
  if (!order || order.userId !== currentUser(response).id) {
    response.status(404).json({ message: "Order not found." });
    return;
  }
  if (order.status !== "Pending") {
    response.status(409).json({ message: "Only pending orders can be cancelled." });
    return;
  }
  try {
    response.json({ order: await changeStatus(order.id, "Cancelled", "Cancelled by customer") });
  } catch (error) {
    fail(response, error);
  }
});

/* ---- Public tracking (by tracking ID) ---- */

router.get("/track/:trackingId", rateLimit(120, 15 * 60_000), async (request, response) => {
  const order = await getOrderByTracking(param(request, "trackingId"));
  if (!order) {
    response.status(404).json({ message: "We couldn't find an order with this tracking ID." });
    return;
  }
  response.json({ tracking: publicTracking(order) });
});

router.get("/track/:trackingId/stream", rateLimit(300, 15 * 60_000), async (request, response) => {
  const order = await getOrderByTracking(param(request, "trackingId"));
  if (!order) {
    response.status(404).json({ message: "Order not found." });
    return;
  }
  if (!subscribe(order.trackingId, response)) {
    response.status(503).json({ message: "Too many people are watching this order right now. Please refresh in a minute." });
    return;
  }
  response.write(`data: ${JSON.stringify(publicTracking(order))}\n\n`);
});

// Full order (address, phone) is only shown when the buyer proves it with their phone number.
const ownedByPhone = async (trackingId: string, phoneInput: unknown) => {
  const order = await getOrderByTracking(trackingId);
  const phone = typeof phoneInput === "string" ? normalizePhone(phoneInput) : null;
  return order && phone && order.shipping.phone === phone ? order : undefined;
};

router.get("/track/:trackingId/invoice", rateLimit(60, 15 * 60_000), async (request, response) => {
  const order = await ownedByPhone(param(request, "trackingId"), request.query.phone);
  if (!order) {
    response.status(404).json({ message: "No order matches this tracking ID and phone number." });
    return;
  }
  response.json({ order, settings: await getSettings() });
});

router.post("/track/:trackingId/pay", rateLimit(20, 15 * 60_000), async (request, response) => {
  const order = await ownedByPhone(param(request, "trackingId"), (request.body as { phone?: string }).phone);
  if (!order) {
    response.status(404).json({ message: "No order matches this tracking ID and phone number." });
    return;
  }
  if (order.paymentMethod !== "sslcommerz" || order.paymentStatus === "paid" || order.status !== "Pending") {
    response.status(409).json({ message: "This order does not need a payment." });
    return;
  }
  try {
    const tranId = newTranId(order.id);
    order.payment = { ...order.payment, tranId };
    await saveOrder(pool, order);
    response.json({ paymentUrl: await startGatewayPayment(order, tranId) });
  } catch (error) {
    response.status(502).json({ message: error instanceof Error ? error.message : "Online payment is unavailable." });
  }
});

export default router;
