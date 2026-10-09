/*
 * COPY-ME TEMPLATE for a new courier (Pathao, RedX, Paperfly, eCourier, Sundarban, ...).
 * This file is NOT used by the shop until you register a finished copy in services/couriers/index.ts.
 *
 * OFFLINE SETUP (you must do these, code cannot):
 *  - open a merchant account with the courier and get its API credentials (usually in the merchant panel > Settings > API)
 *  - read the courier's API documentation: the endpoint names, field names and status words below are placeholders
 *  - put the credentials in backend/.env and add matching lines to config.ts (copy the `steadfast` block)
 *  - test with the courier's sandbox (if any) or with one real parcel
 *
 * Some couriers (for example Pathao) also need extra data such as a store id or city/zone/area codes. If so, add them as
 * env values, or save them in Settings, and pass them in createParcel.
 */
import type { Order, OrderStatus } from "../../types.js";
import type { CourierAdapter } from "./types.js";

const env = (name: string) => process.env[name] ?? "";

export const exampleCourier: CourierAdapter = {
  id: "example", // short, lowercase, never change it after the first parcel
  label: "Example Courier",

  // true only when every key you need is present
  configured: () => Boolean(env("EXAMPLE_API_KEY")),

  createParcel: async (order: Order) => {
    // Cash on delivery amount: 0 when the customer already paid online.
    const cod = order.paymentStatus === "paid" ? 0 : order.total;
    const response = await fetch("https://api.example-courier.com/REPLACE_WITH_REAL_ENDPOINT", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env("EXAMPLE_API_KEY")}` },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        invoice: order.id, // our order number, so the courier's panel shows it
        name: order.shipping.fullName,
        phone: order.shipping.phone,
        address: `${order.shipping.address}, ${order.shipping.city}`,
        cod,
        note: order.shipping.note ?? "",
      }),
    });
    const body = (await response.json().catch(() => ({}))) as Record<string, any>;
    if (!response.ok) throw new Error(body.message ?? `Courier rejected the parcel (HTTP ${response.status}).`);
    return { consignmentId: body.id, trackingCode: body.tracking_code, status: body.status ?? "created" };
  },

  // Optional: remove if the courier has no status API.
  getStatus: async (consignmentId) => {
    const response = await fetch(`https://api.example-courier.com/REPLACE_WITH_REAL_ENDPOINT/${encodeURIComponent(String(consignmentId))}`, {
      headers: { Authorization: `Bearer ${env("EXAMPLE_API_KEY")}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return null;
    return ((await response.json().catch(() => ({}))) as { status?: string }).status ?? null;
  },

  // Courier's words -> our order status. Return null for "do nothing".
  mapStatus: (status): OrderStatus | null => {
    const word = status.toLowerCase();
    if (word.includes("delivered")) return "Delivered";
    if (word.includes("return") || word.includes("cancel")) return "Returned";
    return "Shipped";
  },

  trackUrl: (code) => `https://example-courier.com/track/${encodeURIComponent(code)}`,
};
