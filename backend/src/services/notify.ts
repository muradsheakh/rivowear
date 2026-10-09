import { config } from "../config.js";
import { getSettings } from "../repo/misc.js";
import type { Order } from "../types.js";
import { escapeHtml } from "./email.js";
import { queueEmail, queueSms } from "./outbox.js";

// Messages are saved to the outbox and sent (and retried if the provider is down) by services/outbox.ts.
const sms = queueSms;

const money = (value: number) => `৳${value.toLocaleString("en-US")}`;
const trackLink = (order: Order) => `${config.siteUrl}/track/${order.trackingId}`;

export const notifyOrderPlaced = async (order: Order) => {
  const settings = await getSettings();
  if (settings.sms.orderConfirmation) {
    await sms(
      order.shipping.phone,
      `${settings.storeName}: Order ${order.id} confirmed. Total ${money(order.total)}. Tracking ID: ${order.trackingId}. Track: ${trackLink(order)}`,
    );
  }
  if (order.shipping.email) {
    const rows = order.items
      .map((item) => `<li>${item.quantity} × ${escapeHtml(item.name)} (${escapeHtml(item.size)}, ${escapeHtml(item.color)})</li>`)
      .join("");
    const html = `<h2>Thank you, ${escapeHtml(order.shipping.fullName)}!</h2>
<p>Your order <b>${order.id}</b> has been received.</p>
<p><b>Tracking ID: ${order.trackingId}</b><br/><a href="${trackLink(order)}">Track your order</a></p>
<ul>${rows}</ul>
<p>Subtotal ${money(order.subtotal)}<br/>Delivery ${money(order.shippingFee)}<br/>Discount ${money(order.discount)}<br/><b>Total ${money(order.total)}</b></p>`;
    await queueEmail(order.shipping.email, `Order ${order.id} confirmed`, html);
  }
};

export const notifyStatus = async (order: Order) => {
  const settings = await getSettings();
  if (!settings.sms.statusUpdates) return;
  const messages: Partial<Record<Order["status"], string>> = {
    Processing: `Your order ${order.id} is being prepared.`,
    Shipped: `Your order ${order.id} is on the way${order.courier ? ` (courier tracking: ${order.courier.trackingCode})` : ""}.`,
    Delivered: `Your order ${order.id} was delivered. Thank you! You can now review your products.`,
    Cancelled: `Your order ${order.id} was cancelled.`,
    Returned: `Your order ${order.id} was returned.`,
  };
  const text = messages[order.status];
  if (!text) return;
  await sms(order.shipping.phone, `${settings.storeName}: ${text} Track: ${trackLink(order)}`);
};
