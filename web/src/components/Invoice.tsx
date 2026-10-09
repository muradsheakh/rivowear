"use client";

import type { Order, Settings } from "../shared/api/client";
import { money } from "../shared/money";
import { methodLabel, paymentLabel } from "../shared/orderStatus";

/** One printable A4 invoice. Several can be stacked; each starts on a new printed page. */
const Invoice = ({ order, settings }: { order: Order; settings: Settings }) => (
  <article className="mx-auto max-w-3xl bg-white p-8 text-sm text-gray-900 print:max-w-none print:break-after-page print:p-0">
    <header className="flex items-start justify-between border-b pb-5">
      <div>
        <h1 className="text-2xl font-bold">{settings.storeName}</h1>
        <p className="mt-1 text-gray-600">{settings.address}</p>
        <p className="text-gray-600">{settings.phone} · {settings.email}</p>
      </div>
      <div className="text-right">
        <p className="text-xl font-semibold tracking-widest">INVOICE</p>
        <p className="mt-1 font-mono">{order.id}</p>
        <p className="text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</p>
      </div>
    </header>

    <section className="mt-5 grid grid-cols-2 gap-6">
      <div>
        <p className="text-xs tracking-widest text-gray-500 uppercase">Bill to / Ship to</p>
        <p className="mt-1 font-semibold">{order.shipping.fullName}</p>
        <p>{order.shipping.address}</p>
        <p>{order.shipping.city} {order.shipping.postalCode}</p>
        <p>{order.shipping.phone}</p>
        {order.shipping.email && <p>{order.shipping.email}</p>}
      </div>
      <div className="text-right">
        <p className="text-xs tracking-widest text-gray-500 uppercase">Order details</p>
        <p className="mt-1">Tracking ID: <span className="font-mono font-semibold">{order.trackingId}</span></p>
        <p>Payment: {methodLabel[order.paymentMethod]}</p>
        <p>Status: <b>{paymentLabel[order.paymentStatus]}</b></p>
        {order.courier && <p>Courier code: <span className="font-mono">{order.courier.trackingCode}</span></p>}
      </div>
    </section>

    <table className="mt-6 w-full text-left">
      <thead>
        <tr className="border-y bg-gray-50 text-xs uppercase">
          <th className="px-2 py-2">Item</th><th className="px-2 py-2">Size / Color</th><th className="px-2 py-2 text-right">Price</th><th className="px-2 py-2 text-right">Qty</th><th className="px-2 py-2 text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        {order.items.map((item) => (
          <tr key={`${item.productId}-${item.size}-${item.color}`} className="border-b">
            <td className="px-2 py-2">{item.name}</td>
            <td className="px-2 py-2">{item.size} / {item.color}</td>
            <td className="px-2 py-2 text-right">{money(item.price)}</td>
            <td className="px-2 py-2 text-right">{item.quantity}</td>
            <td className="px-2 py-2 text-right">{money(item.price * item.quantity)}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <div className="mt-4 ml-auto w-64 space-y-1">
      <p className="flex justify-between"><span>Subtotal</span><span>{money(order.subtotal)}</span></p>
      {order.discount > 0 && <p className="flex justify-between"><span>Discount {order.couponCode && `(${order.couponCode})`}</span><span>-{money(order.discount)}</span></p>}
      <p className="flex justify-between"><span>Delivery</span><span>{money(order.shippingFee)}</span></p>
      <p className="flex justify-between border-t pt-2 text-base font-bold"><span>Total</span><span>{money(order.total)}</span></p>
      {order.paymentStatus !== "paid" && order.paymentMethod === "cod" && <p className="flex justify-between text-gray-600"><span>Collect on delivery</span><span>{money(order.total)}</span></p>}
    </div>

    {order.shipping.note && <p className="mt-5 text-gray-600">Note: {order.shipping.note}</p>}
    <footer className="mt-10 border-t pt-4 text-center text-xs text-gray-500">{settings.invoiceNote}</footer>
  </article>
);

export default Invoice;
