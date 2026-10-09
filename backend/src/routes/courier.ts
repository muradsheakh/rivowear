import { Router } from "express";
import { timingSafeEqual } from "node:crypto";
import { config } from "../config.js";
import { applyCourierStatus } from "../lib/courierSync.js";
import { mutateOrder } from "../lib/orders.js";
import { getOrderByConsignment, getOrderById } from "../repo/orders.js";

const router = Router();

const sameSecret = (given: string, expected: string) => {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

/** Steadfast writes "Partial Delivered" / "Delivered"; the polling API writes "partial_delivered". Make them the same. */
const normalizeStatus = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");

/**
 * Steadfast webhook: Steadfast calls us the moment a parcel changes status (no more waiting for the 10-minute poll).
 *
 * OFFLINE SETUP (needs you, once):
 *  1. Set STEADFAST_WEBHOOK_TOKEN in backend/.env (any long random string), then restart the API.
 *  2. Steadfast merchant panel > Settings > API / Webhook: Callback URL = https://api.yourdomain.com/api/courier/steadfast/webhook
 *     and Auth Token = the same string. (Menu names can differ a little; ask Steadfast support if you cannot find it.)
 *  3. Use their "test" button, or place one real parcel, and check the order history for a "Courier: ..." line.
 *  The URL must be public HTTPS, so this will not work on localhost unless you use a tunnel such as ngrok.
 */
router.post("/steadfast/webhook", async (request, response) => {
  const expected = config.steadfast.webhookToken;
  if (!expected) {
    response.status(503).json({ status: "error", message: "Webhook is not configured." });
    return;
  }
  const given = (request.header("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!sameSecret(given, expected)) {
    response.status(401).json({ status: "error", message: "Unauthorized." });
    return;
  }

  const body = (request.body ?? {}) as Record<string, unknown>;
  const type = String(body.notification_type ?? "delivery_status");
  // Always answer 200 for messages we can ignore, otherwise Steadfast keeps retrying them.
  const ok = (message: string) => response.json({ status: "success", message });

  try {
    const consignmentId = body.consignment_id === undefined ? "" : String(body.consignment_id);
    const invoice = typeof body.invoice === "string" ? body.invoice : "";
    // We send our order id (RW-1001) as the invoice when creating the parcel, so it is the primary key; consignment id is the fallback.
    const order = (invoice ? await getOrderById(invoice) : undefined) ?? (consignmentId ? await getOrderByConsignment(consignmentId) : undefined);
    if (!order?.courier) {
      console.warn(`[steadfast-webhook] no matching order (invoice=${invoice || "-"}, consignment=${consignmentId || "-"})`);
      ok("Ignored: unknown parcel.");
      return;
    }
    if (consignmentId && String(order.courier.consignmentId) !== consignmentId) {
      console.warn(`[steadfast-webhook] consignment mismatch for ${order.id}`);
      ok("Ignored: parcel mismatch.");
      return;
    }

    const message = typeof body.tracking_message === "string" ? body.tracking_message : "";
    if (type === "tracking_update") {
      // Only a note like "arrived at hub": shown in the order history, status unchanged.
      if (message) await applyCourierNote(order.id, message);
    } else {
      const status = normalizeStatus(body.status);
      // "unknown" and empty values carry no information.
      if (status && status !== "unknown") await applyCourierStatus(order.id, "steadfast", status, message);
    }
    ok("Webhook received successfully.");
  } catch (error) {
    // 500 makes Steadfast retry later, which is what we want for a temporary database problem.
    console.error("[steadfast-webhook] failed:", error);
    response.status(500).json({ status: "error", message: "Could not process the update." });
  }
});

const applyCourierNote = async (orderId: string, message: string) => {
  const note = `Courier: ${message}`.slice(0, 200);
  await mutateOrder(orderId, (current) => {
    if (current.history[current.history.length - 1]?.note === note) return; // same message delivered twice
    current.history.push({ status: current.status, note, at: new Date().toISOString() });
  });
};

export default router;
