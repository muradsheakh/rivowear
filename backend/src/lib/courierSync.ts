import { listShippedWithCourier } from "../repo/orders.js";
import { getCourier } from "../services/couriers/index.js";
import { notifyStatus } from "../services/notify.js";
import { applyStatus, mutateOrder } from "./orders.js";

/**
 * Records a new Steadfast delivery_status on an order (shared by the 10-minute poll and the webhook).
 * Safe to call twice with the same status, and safe when messages arrive late or out of order:
 * the order's own status is only moved while it is still "Shipped", so a late "in transit"
 * message can never pull a Delivered/Returned order back to Shipped.
 * Returns true when something changed.
 */
export const applyCourierStatus = async (orderId: string, provider: string, deliveryStatus: string, detail = ""): Promise<boolean> => {
  const mapped = getCourier(provider)?.mapStatus?.(deliveryStatus) ?? null;
  const note = `Courier: ${deliveryStatus.replace(/_/g, " ")}${detail ? ` (${detail})`.slice(0, 120) : ""}`;
  let changed = false;
  let statusChanged = false;
  const saved = await mutateOrder(orderId, async (current, client) => {
    if (!current.courier || current.courier.status === deliveryStatus) return;
    changed = true;
    current.courier.status = deliveryStatus;
    if (mapped && mapped !== current.status && current.status === "Shipped") {
      statusChanged = true;
      await applyStatus(client, current, mapped, note);
    } else {
      current.history.push({ status: current.status, note, at: new Date().toISOString() });
    }
  });
  if (statusChanged) void notifyStatus(saved);
  return changed;
};

/** Pulls the latest delivery status from each courier for every parcel still on its way (couriers without a status API are skipped). */
export const syncCourierStatuses = async (): Promise<number> => {
  let updated = 0;
  for (const order of await listShippedWithCourier()) {
    if (!order.courier) continue;
    const courier = getCourier(order.courier.provider);
    if (!courier?.getStatus || !courier.configured()) continue;
    try {
      const deliveryStatus = await courier.getStatus(order.courier.consignmentId);
      if (!deliveryStatus || deliveryStatus === order.courier.status) continue;
      if (await applyCourierStatus(order.id, order.courier.provider, deliveryStatus)) updated += 1;
    } catch (error) {
      console.error(`[courier] could not sync ${order.id}:`, error);
    }
  }
  return updated;
};
