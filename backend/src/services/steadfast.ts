import { config, steadfastConfigured } from "../config.js";
import type { Order, OrderStatus } from "../types.js";

type CreateResult = { consignmentId: string | number; trackingCode: string; status: string; mock?: boolean };

const headers = () => ({
  "Content-Type": "application/json",
  Accept: "application/json",
  "Api-Key": config.steadfast.apiKey,
  "Secret-Key": config.steadfast.secretKey,
});

/** Creates a parcel in the Steadfast merchant panel. The customer's address lands there automatically. */
export const createParcel = async (order: Order): Promise<CreateResult> => {
  if (!steadfastConfigured()) {
    if (config.isProd) throw new Error("Steadfast API keys are not configured.");
    // Development only: pretend, so the full flow can be tried without keys.
    return { consignmentId: `MOCK-${order.id}`, trackingCode: `MOCK${order.trackingId}`, status: "in_review", mock: true };
  }

  const codAmount = order.paymentStatus === "paid" ? 0 : order.total;
  const response = await fetch(`${config.steadfast.baseUrl}/create_order`, {
    method: "POST",
    headers: headers(),
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      invoice: order.id,
      recipient_name: order.shipping.fullName,
      recipient_phone: order.shipping.phone,
      recipient_address: `${order.shipping.address}, ${order.shipping.city}${order.shipping.postalCode ? ` ${order.shipping.postalCode}` : ""}`.slice(0, 250),
      cod_amount: codAmount,
      note: order.shipping.note ?? "",
      recipient_email: order.shipping.email,
    }),
  });
  const body = (await response.json().catch(() => ({}))) as {
    status?: number;
    message?: string;
    consignment?: { consignment_id: string | number; tracking_code: string; status: string };
  };
  if (!response.ok || !body.consignment) {
    throw new Error(body.message ?? `Steadfast rejected the parcel (HTTP ${response.status}).`);
  }
  return {
    consignmentId: body.consignment.consignment_id,
    trackingCode: body.consignment.tracking_code,
    status: body.consignment.status,
  };
};

export const getDeliveryStatus = async (consignmentId: string | number): Promise<string | null> => {
  if (!steadfastConfigured()) return null;
  const response = await fetch(`${config.steadfast.baseUrl}/status_by_cid/${encodeURIComponent(String(consignmentId))}`, {
    headers: headers(),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) return null;
  const body = (await response.json().catch(() => ({}))) as { delivery_status?: string };
  return body.delivery_status ?? null;
};

/** Maps Steadfast's delivery_status to our order status. Returns null when nothing should change. */
export const mapCourierStatus = (deliveryStatus: string): OrderStatus | null => {
  if (deliveryStatus === "delivered" || deliveryStatus === "partial_delivered") return "Delivered";
  if (deliveryStatus === "cancelled") return "Returned";
  if (deliveryStatus.endsWith("_approval_pending")) return null;
  return "Shipped";
};

export const courierTrackUrl = (trackingCode: string) => `https://steadfast.com.bd/t/${encodeURIComponent(trackingCode)}`;
