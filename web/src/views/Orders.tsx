"use client";

import { money } from "../shared/money";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "../context/useCart";
import { api, type Order } from "../shared/api/client";
import { statusStyle } from "../shared/orderStatus";
import { useAuth } from "../shared/context/useAuth";

const Orders = () => {
  const { token, user } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const { addToCart } = useCart();

  useEffect(() => {
    if (!token) return;
    api
      .myOrders(token)
      .then((response) => setOrders(response.orders))
      .catch((requestError: Error) => setError(requestError.message));
  }, [token]);

  // Puts the items of an old order into the cart again, but only the colors and sizes that are in stock today.
  const buyAgain = async (order: Order) => {
    setNotice("");
    let added = 0;
    const skipped: string[] = [];
    for (const item of order.items) {
      try {
        const { product } = await api.product(item.productId);
        const stock = product.variants.find((variant) => variant.color === item.color && variant.size === item.size)?.stock ?? 0;
        if (stock === 0) {
          skipped.push(`${item.name} (${item.color}, ${item.size})`);
          continue;
        }
        const color = product.colors.find((candidate) => candidate.name === item.color);
        addToCart({ productId: product.id, name: product.name, price: product.price, size: item.size, color: item.color, image: color?.images[0] ?? product.image, maxStock: stock }, Math.min(item.quantity, stock));
        added += 1;
      } catch {
        skipped.push(item.name);
      }
    }
    setNotice(`${added} item(s) added to your cart.${skipped.length ? ` Not available right now: ${skipped.join(", ")}.` : ""}`);
  };

  const cancel = (id: string) => {
    if (!token || !window.confirm("Cancel this order?")) return;
    api
      .cancelOrder(token, id)
      .then(({ order }) => setOrders((current) => current?.map((item) => (item.id === order.id ? order : item)) ?? null))
      .catch((requestError: Error) => setError(requestError.message));
  };

  return (
    <>
            <div>
        <h1 className="text-3xl font-semibold tracking-tight">My orders</h1>
        <p className="mt-2 text-sm text-gray-500">{user?.name} · {user?.contact}</p>
        {error && <p className="mt-6 text-sm text-red-600" role="alert">{error}</p>}
        {notice && <p className="mt-6 rounded-md bg-green-50 p-3 text-sm text-green-800" role="status">{notice} <Link href="/checkout" className="font-medium underline">Go to checkout</Link></p>}
        {!orders && !error && <p className="mt-10 text-sm text-gray-500">Loading orders...</p>}
        {orders?.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-gray-500">You haven&apos;t placed any orders yet.</p>
            <Link href="/shop" className="mt-6 inline-flex rounded-md bg-black px-6 py-3 text-sm text-white">Start shopping</Link>
          </div>
        )}
        <div className="mt-8 space-y-5">
          {orders?.map((order) => (
            <section key={order.id} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">Order {order.id}</p>
                  <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyle[order.status]}`}>{order.status}</span>
              </div>
              <div className="mt-4 space-y-3">
                {order.items.map((item) => (
                  <div key={`${item.productId}-${item.size}-${item.color}`} className="flex gap-3">
                    <img src={item.image} alt="" className="h-16 w-14 rounded object-cover" />
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.size} · {item.color} · Qty {item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium">{money(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <Link href={`/track/${order.trackingId}`} className="font-medium underline underline-offset-4">Track ({order.trackingId})</Link>
                  <Link href={`/invoice/${order.trackingId}?phone=${encodeURIComponent(order.shipping.phone)}`} className="underline underline-offset-4">Invoice</Link>
                  {order.status === "Delivered" && order.items.slice(0, 1).map((item) => (
                    <Link key={item.productId} href={`/product/${item.productId}#reviews`} className="text-green-700 underline underline-offset-4">Write a review</Link>
                  ))}
                </div>
                <div className="flex items-center gap-4">
                  {(order.status === "Delivered" || order.status === "Cancelled") && (
                    <button type="button" onClick={() => void buyAgain(order)} className="text-sm font-medium underline underline-offset-4">Buy again</button>
                  )}
                  {order.status === "Pending" && (
                    <button type="button" onClick={() => cancel(order.id)} className="text-sm text-red-700 underline underline-offset-4">Cancel</button>
                  )}
                  <p className="font-semibold">{money(order.total)}</p>
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
          </>
  );
};

export default Orders;
