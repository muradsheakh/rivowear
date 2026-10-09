"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "@/shared/router";
import { api, type CourierOption, type Order, type OrderStatus, type PaymentStatus } from "../../shared/api/client";
import { useAuth } from "../../shared/context/useAuth";
import { money } from "../../shared/money";
import { methodLabel, paymentLabel, statusStyle } from "../../shared/orderStatus";

const STATUSES: OrderStatus[] = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Returned"];

const AdminOrderDetail = () => {
  const { id = "" } = useParams();
  const { token } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [couriers, setCouriers] = useState<CourierOption[]>([]);
  const [provider, setProvider] = useState("");
  const [courierName, setCourierName] = useState("");
  const [trackingCode, setTrackingCode] = useState("");

  useEffect(() => {
    if (!token) return;
    api.admin.order(token, id).then((response) => setOrder(response.order)).catch((requestError: Error) => setError(requestError.message));
    api.admin.couriers(token).then((response) => { setCouriers(response.couriers); setProvider(response.default); }).catch(() => undefined);
  }, [token, id]);

  const run = (action: () => Promise<{ order: Order }>, success: string) => {
    setBusy(true);
    setError("");
    setMessage("");
    action()
      .then((response) => {
        setOrder(response.order);
        setMessage(success);
        setNote("");
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setBusy(false));
  };

  if (error && !order) return <p className="text-sm text-red-600" role="alert">{error}</p>;
  if (!order || !token) return <p className="text-sm text-gray-500">Loading order...</p>;

  const closed = order.status === "Cancelled" || order.status === "Returned";
  const canSend = !order.courier && !closed && order.status !== "Delivered" && (order.paymentMethod === "cod" || order.paymentStatus === "paid");
  const isManual = couriers.find((item) => item.id === provider)?.manual ?? false;
  const selectedLabel = couriers.find((item) => item.id === provider)?.label ?? "Steadfast";
  const phoneIntl = `88${order.shipping.phone}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/orders" className="text-sm underline">← All orders</Link>
          <h2 className="mt-2 text-2xl font-semibold">{order.id} <span className={`ml-2 rounded-full px-3 py-1 align-middle text-xs font-medium ${statusStyle[order.status]}`}>{order.status}</span></h2>
          <p className="text-sm text-gray-500">Tracking ID <span className="font-mono">{order.trackingId}</span> · {new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <Link href={`/admin/invoices?ids=${order.id}`} className="rounded-md bg-black px-5 py-2 text-sm text-white">Print invoice</Link>
      </div>

      {message && <p className="rounded-md bg-green-50 p-3 text-sm text-green-800" role="status">{message}</p>}
      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5 text-sm">
          <h3 className="font-semibold">Customer & delivery</h3>
          <p className="mt-3 font-medium">{order.shipping.fullName} {order.userId ? "" : <span className="ml-1 rounded bg-gray-100 px-2 py-0.5 text-xs">Guest</span>}</p>
          <p className="mt-1">{order.shipping.address}</p>
          <p>{order.shipping.city} {order.shipping.postalCode}</p>
          <p className="mt-2">{order.shipping.phone}{order.shipping.email && ` · ${order.shipping.email}`}</p>
          {order.shipping.note && <p className="mt-2 rounded bg-amber-50 p-2 text-amber-900">Note: {order.shipping.note}</p>}
          <div className="mt-3 flex gap-4">
            <a href={`tel:${order.shipping.phone}`} className="underline underline-offset-4">Call</a>
            <a href={`https://wa.me/${phoneIntl}`} target="_blank" rel="noopener noreferrer" className="text-green-700 underline underline-offset-4">WhatsApp</a>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 text-sm">
          <h3 className="font-semibold">Payment</h3>
          <p className="mt-3">{methodLabel[order.paymentMethod]} · <b>{paymentLabel[order.paymentStatus]}</b></p>
          {order.payment?.trxId && <p className="mt-1">TrxID <span className="font-mono">{order.payment.trxId}</span> from {order.payment.senderNumber}</p>}
          {order.payment?.tranId && <p className="mt-1 font-mono text-xs text-gray-500">{order.payment.tranId}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {(["paid", "failed", "unpaid", "refunded"] as PaymentStatus[]).filter((value) => value !== order.paymentStatus).map((value) => (
              <button key={value} type="button" disabled={busy} onClick={() => run(() => api.admin.setPaymentStatus(token, order.id, value), `Payment marked ${paymentLabel[value].toLowerCase()}.`)} className="rounded-md border border-gray-300 px-3 py-1.5 capitalize hover:bg-gray-50">Mark {value}</button>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5 text-sm">
        <h3 className="font-semibold">Items</h3>
        <div className="mt-3 divide-y">
          {order.items.map((item) => (
            <div key={`${item.productId}-${item.size}-${item.color}`} className="flex items-center gap-3 py-3">
              <img src={item.image} alt="" className="h-14 w-12 rounded object-cover" />
              <p className="flex-1"><span className="font-medium">{item.name}</span><br /><span className="text-xs text-gray-500">{item.size} · {item.color} · Qty {item.quantity}</span></p>
              <p>{money(item.price * item.quantity)}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 ml-auto w-60 space-y-1 border-t pt-3">
          <p className="flex justify-between"><span>Subtotal</span><span>{money(order.subtotal)}</span></p>
          {order.discount > 0 && <p className="flex justify-between"><span>Discount</span><span>-{money(order.discount)}</span></p>}
          <p className="flex justify-between"><span>Delivery</span><span>{money(order.shippingFee)}</span></p>
          <p className="flex justify-between text-base font-semibold"><span>Total</span><span>{money(order.total)}</span></p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5 text-sm">
          <h3 className="font-semibold">Courier{order.courier ? ` (${order.courier.name ?? "Steadfast"})` : ""}</h3>
          {order.courier ? (
            <div className="mt-3 space-y-1">
              <p>Parcel code: <span className="font-mono">{order.courier.trackingCode}</span>{order.courier.mock && <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs">test mode</span>}</p>
              <p>Courier status: {order.courier.status.replace(/_/g, " ")}</p>
              <p className="text-gray-500">Sent {new Date(order.courier.sentAt).toLocaleString()}</p>
            </div>
          ) : (
            <>
              {couriers.length > 1 && (
                <select value={provider} onChange={(event) => setProvider(event.target.value)} className="mt-3 h-10 w-full rounded-md border border-gray-200 px-3 text-sm" aria-label="Courier">
                  {couriers.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              )}
              {isManual ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <input value={courierName} onChange={(event) => setCourierName(event.target.value)} placeholder="Courier name (e.g. Pathao)" className="h-10 rounded-md border border-gray-200 px-3 text-sm" />
                  <input value={trackingCode} onChange={(event) => setTrackingCode(event.target.value)} placeholder="Tracking / consignment code" className="h-10 rounded-md border border-gray-200 px-3 text-sm" />
                  <p className="text-xs text-gray-500 sm:col-span-2">Book the parcel on the courier&apos;s own site or app first, then type its code here. Mark it Delivered yourself when it arrives.</p>
                </div>
              ) : (
                <p className="mt-3 text-gray-600">Creates the parcel in your {selectedLabel} account with the customer&apos;s name, phone, address and COD amount.</p>
              )}
              <button type="button" disabled={busy || !canSend || (isManual && (!courierName.trim() || !trackingCode.trim()))} onClick={() => run(() => api.admin.sendToCourier(token, order.id, { provider: provider || undefined, courierName, trackingCode }), `Parcel sent to ${isManual ? courierName.trim() : selectedLabel}. The customer was notified by SMS.`)} className="mt-4 rounded-md bg-black px-5 py-2 text-white disabled:opacity-50">
                {busy ? "Sending..." : `Send to ${isManual ? "courier" : selectedLabel}`}
              </button>
              {!canSend && <p className="mt-2 text-xs text-gray-500">{order.paymentMethod !== "cod" && order.paymentStatus !== "paid" ? "Confirm the payment first." : "Not available for this order status."}</p>}
            </>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 text-sm">
          <h3 className="font-semibold">Update status</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {STATUSES.filter((value) => value !== order.status).map((value) => (
              <button key={value} type="button" disabled={busy || closed} onClick={() => run(() => api.admin.setOrderStatus(token, order.id, value, note || undefined), `Status changed to ${value}. The customer was notified.`)} className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40">{value}</button>
            ))}
          </div>
          <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder="Optional note shown to the customer" className="mt-3 h-10 w-full rounded-md border border-gray-200 px-3 outline-none focus:border-black" />
          {closed && <p className="mt-2 text-xs text-gray-500">Cancelled or returned orders cannot be changed.</p>}
        </section>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5 text-sm">
        <h3 className="font-semibold">History</h3>
        <ul className="mt-3 space-y-2">
          {[...order.history].reverse().map((event, index) => (
            <li key={event.at + index} className="flex justify-between gap-4"><span>{event.note}</span><span className="text-gray-500">{new Date(event.at).toLocaleString()}</span></li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default AdminOrderDetail;
