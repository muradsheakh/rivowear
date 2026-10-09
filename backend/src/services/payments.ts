import { config, sslConfigured } from "../config.js";
import type { Order } from "../types.js";

const base = () => (config.sslcommerz.live ? "https://securepay.sslcommerz.com" : "https://sandbox.sslcommerz.com");

export const gatewayAvailable = () => sslConfigured() || !config.isProd;

/**
 * Starts an SSLCommerz session (bKash, Nagad, Rocket, cards and internet banking are all offered on its page).
 * Without credentials, and outside production, a local mock page is used so the flow can be tested.
 */
export const startGatewayPayment = async (order: Order, tranId: string): Promise<string> => {
  const api = config.publicApiUrl;
  if (!sslConfigured()) {
    if (config.isProd) throw new Error("Online payment is not configured.");
    return `${api}/api/payments/mock?tran=${encodeURIComponent(tranId)}`;
  }

  const form = new URLSearchParams({
    store_id: config.sslcommerz.storeId,
    store_passwd: config.sslcommerz.storePass,
    total_amount: order.total.toFixed(2),
    currency: "BDT",
    tran_id: tranId,
    success_url: `${api}/api/payments/sslcommerz/success`,
    fail_url: `${api}/api/payments/sslcommerz/fail`,
    cancel_url: `${api}/api/payments/sslcommerz/cancel`,
    ipn_url: `${api}/api/payments/sslcommerz/ipn`,
    cus_name: order.shipping.fullName,
    cus_email: order.shipping.email ?? "customer@example.com",
    cus_add1: order.shipping.address,
    cus_city: order.shipping.city,
    cus_postcode: order.shipping.postalCode ?? "1000",
    cus_country: "Bangladesh",
    cus_phone: order.shipping.phone,
    shipping_method: "NO",
    product_name: `Order ${order.id}`,
    product_category: "Clothing",
    product_profile: "general",
  });
  const response = await fetch(`${base()}/gwprocess/v4/api.php`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await response.json().catch(() => ({}))) as { status?: string; GatewayPageURL?: string; failedreason?: string };
  if (body.status !== "SUCCESS" || !body.GatewayPageURL) {
    throw new Error(body.failedreason ?? "Could not start the online payment.");
  }
  return body.GatewayPageURL;
};

/** Confirms with SSLCommerz that the payment is real and matches the order amount. */
export const validateGatewayPayment = async (valId: string, order: Order): Promise<boolean> => {
  if (!sslConfigured()) return !config.isProd && valId === "mock";
  const url = new URL(`${base()}/validator/api/validationserverAPI.php`);
  url.searchParams.set("val_id", valId);
  url.searchParams.set("store_id", config.sslcommerz.storeId);
  url.searchParams.set("store_passwd", config.sslcommerz.storePass);
  url.searchParams.set("format", "json");
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  const body = (await response.json().catch(() => ({}))) as { status?: string; amount?: string; currency?: string; tran_id?: string };
  const validStatus = body.status === "VALID" || body.status === "VALIDATED";
  return validStatus && body.tran_id === order.payment?.tranId && Math.abs(Number(body.amount) - order.total) < 0.01;
};
