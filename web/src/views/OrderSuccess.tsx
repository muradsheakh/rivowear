"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "@/shared/router";
import Footer from "../components/Common/Footer";
import Header from "../components/Common/Header";
import { api, type Tracking } from "../shared/api/client";
import { money } from "../shared/money";
import { useLastPhone } from "../shared/useLastPhone";

const OrderSuccess = () => {
  const [params] = useSearchParams();
  const trackingId = params.get("tracking") ?? "";
  const payment = params.get("payment");
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const phone = useLastPhone();

  useEffect(() => {
    if (!trackingId) return;
    api.track(trackingId).then((response) => setTracking(response.tracking)).catch((requestError: Error) => setError(requestError.message));
  }, [trackingId]);

  const copy = () => {
    void navigator.clipboard.writeText(trackingId).then(() => setCopied(true));
  };

  const retry = () => {
    api.retryPayment(trackingId, phone).then(({ paymentUrl }) => { window.location.href = paymentUrl; }).catch((requestError: Error) => setError(requestError.message));
  };

  const failed = payment === "failed" || payment === "cancelled";
  const needsPayment = tracking?.paymentMethod === "sslcommerz" && tracking.paymentStatus !== "paid" && tracking.status === "Pending";

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-6 py-20 text-center">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-2xl ${failed ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>{failed ? "!" : "✓"}</div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">{failed ? "Payment was not completed" : "Order placed successfully"}</h1>
        <p className="mt-3 text-gray-500">
          {failed
            ? "Your order is saved, but we haven't received the payment yet. You can try again."
            : "Thank you for shopping with us. We've sent a confirmation SMS with your tracking ID."}
        </p>

        {trackingId && (
          <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-xs tracking-widest text-gray-500 uppercase">Your tracking ID</p>
            <p className="mt-2 font-mono text-3xl font-bold tracking-wider">{trackingId}</p>
            <button type="button" onClick={copy} className="mt-3 text-sm underline underline-offset-4">{copied ? "Copied!" : "Copy"}</button>
            {tracking && (
              <p className="mt-4 text-sm text-gray-600">
                Order {tracking.orderId} · {money(tracking.total)} · {tracking.paymentMethod === "cod" ? "Cash on delivery" : tracking.paymentStatus === "paid" ? "Paid" : "Payment pending"}
              </p>
            )}
          </div>
        )}
        {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {needsPayment && phone && <button type="button" onClick={retry} className="rounded-md bg-black px-6 py-3 text-sm font-medium text-white">Pay now</button>}
          {trackingId && <Link href={`/track/${trackingId}`} className="rounded-md bg-black px-6 py-3 text-sm font-medium text-white">Track order</Link>}
          {trackingId && phone && <Link href={`/invoice/${trackingId}?phone=${encodeURIComponent(phone)}`} className="rounded-md border border-black px-6 py-3 text-sm font-medium">View invoice</Link>}
          <Link href="/shop" className="rounded-md border border-gray-300 px-6 py-3 text-sm font-medium">Continue shopping</Link>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default OrderSuccess;
