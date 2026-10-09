import { Router } from "express";
import { config } from "../config.js";
import { mutateOrder } from "../lib/orders.js";
import { getOrderByTran } from "../repo/orders.js";
import { escapeHtml } from "../services/email.js";
import { notifyOrderPlaced } from "../services/notify.js";
import { validateGatewayPayment } from "../services/payments.js";
import type { Order } from "../types.js";

const router = Router();

const redirect = (order: Order | undefined, outcome: string) =>
  `${config.siteUrl}/order-success?${order ? `tracking=${order.trackingId}&` : ""}payment=${outcome}`;

/** Marks the order paid only after SSLCommerz itself confirms the payment and the amount. */
const settle = async (order: Order, valId: string): Promise<boolean> => {
  if (order.paymentStatus === "paid") return true;
  let valid = false;
  try {
    valid = await validateGatewayPayment(valId, order);
  } catch (error) {
    console.error("[payments] validation failed:", error);
  }
  let newlyPaid = false;
  const saved = await mutateOrder(order.id, (current) => {
    if (current.paymentStatus === "paid") return; // the IPN and the browser can arrive together
    const at = new Date().toISOString();
    if (valid) {
      current.paymentStatus = "paid";
      current.payment = { ...current.payment, paidAt: at };
      current.history.push({ status: current.status, note: "Online payment received", at });
      newlyPaid = true;
    } else {
      current.paymentStatus = "failed";
      current.history.push({ status: current.status, note: "Online payment failed", at });
    }
  });
  if (newlyPaid) void notifyOrderPlaced(saved);
  return saved.paymentStatus === "paid";
};

const byTran = (body: Record<string, unknown>) => getOrderByTran(String(body.tran_id ?? ""));

// The customer's browser is sent back here by SSLCommerz. We never trust it: the amount and status are re-checked server to server.
router.post("/sslcommerz/success", async (request, response) => {
  const order = await byTran(request.body ?? {});
  if (!order) {
    response.redirect(303, redirect(undefined, "failed"));
    return;
  }
  const ok = await settle(order, String(request.body.val_id ?? ""));
  response.redirect(303, redirect(order, ok ? "success" : "failed"));
});

router.post("/sslcommerz/fail", async (request, response) => {
  const order = await byTran(request.body ?? {});
  if (order && order.paymentStatus !== "paid") {
    await mutateOrder(order.id, (current) => {
      if (current.paymentStatus !== "paid") current.paymentStatus = "failed";
    });
  }
  response.redirect(303, redirect(order, "failed"));
});

router.post("/sslcommerz/cancel", async (request, response) => {
  response.redirect(303, redirect(await byTran(request.body ?? {}), "cancelled"));
});

// Server-to-server notification, in case the customer closes the browser before returning.
router.post("/sslcommerz/ipn", async (request, response) => {
  const order = await byTran(request.body ?? {});
  if (order) await settle(order, String(request.body.val_id ?? ""));
  response.status(200).send("OK");
});

// Local test page, only available while SSLCommerz keys are not configured and not in production.
router.get("/mock", (request, response) => {
  if (config.isProd || config.sslcommerz.storeId) {
    response.status(404).send("Not found");
    return;
  }
  const tran = escapeHtml(String(request.query.tran ?? ""));
  const form = (action: string, label: string, extra: string) =>
    `<form method="post" action="/api/payments/sslcommerz/${action}"><input type="hidden" name="tran_id" value="${tran}"/>${extra}<button style="padding:12px 20px;margin:6px;font-size:16px">${label}</button></form>`;
  response.type("html").send(
    `<body style="font-family:sans-serif;text-align:center;padding:60px"><h2>Test payment page</h2><p>SSLCommerz is not configured, so this is a local simulation.</p>${form("success", "Pay successfully", '<input type="hidden" name="val_id" value="mock"/>')}${form("fail", "Fail payment", "")}${form("cancel", "Cancel", "")}</body>`,
  );
});

export default router;
