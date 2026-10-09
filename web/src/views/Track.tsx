"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "@/shared/router";
import Footer from "../components/Common/Footer";
import Header from "../components/Common/Header";
import { API_BASE, api, type OrderStatus, type Tracking } from "../shared/api/client";
import { useLastPhone } from "../shared/useLastPhone";
import { money } from "../shared/money";
import { statusStyle } from "../shared/orderStatus";

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "Pending", label: "Order placed" },
  { status: "Processing", label: "Preparing" },
  { status: "Shipped", label: "On the way" },
  { status: "Delivered", label: "Delivered" },
];

const Track = () => {
  const { trackingId = "" } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(trackingId);
  const [data, setData] = useState<{ id: string; tracking?: Tracking; error?: string } | null>(null);
  const [live, setLive] = useState(false);
  const savedPhone = useLastPhone();
  const [typedPhone, setPhone] = useState<string | null>(null);
  const phone = typedPhone ?? savedPhone;

  useEffect(() => {
    if (!trackingId) return;
    let cancelled = false;
    api
      .track(trackingId)
      .then(({ tracking }) => !cancelled && setData({ id: trackingId, tracking }))
      .catch((error: Error) => !cancelled && setData({ id: trackingId, error: error.message }));

    // Live updates: the server pushes a message whenever the order changes.
    const source = new EventSource(`${API_BASE}/track/${encodeURIComponent(trackingId)}/stream`);
    source.onopen = () => setLive(true);
    source.onerror = () => setLive(false);
    source.onmessage = (event) => {
      if (!cancelled) setData({ id: trackingId, tracking: JSON.parse(event.data as string) as Tracking });
    };
    return () => {
      cancelled = true;
      source.close();
    };
  }, [trackingId]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = input.trim().toUpperCase();
    if (value) navigate(`/track/${value}`);
  };

  const ready = data?.id === trackingId ? data : null;
  const tracking = ready?.tracking;
  const stepIndex = tracking ? STEPS.findIndex((step) => step.status === tracking.status) : -1;
  const closed = tracking?.status === "Cancelled" || tracking?.status === "Returned";

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <h1 className="text-3xl font-semibold tracking-tight">Track your order</h1>
        <p className="mt-2 text-sm text-gray-500">Enter the tracking ID from your confirmation SMS or email.</p>
        <form onSubmit={submit} className="mt-6 flex gap-2">
          <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="e.g. RWK7M2QX9P" aria-label="Tracking ID" className="h-12 min-w-0 flex-1 rounded-md border border-gray-300 px-4 font-mono uppercase outline-none focus:border-black" />
          <button type="submit" className="rounded-md bg-black px-6 text-sm font-medium text-white">Track</button>
        </form>

        {trackingId && !ready && <p className="mt-10 text-sm text-gray-500">Looking up your order...</p>}
        {ready?.error && <p className="mt-10 rounded-md bg-red-50 p-4 text-sm text-red-700" role="alert">{ready.error}</p>}

        {tracking && (
          <section className="mt-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-xl font-bold">{tracking.trackingId}</p>
                <p className="text-sm text-gray-500">Order {tracking.orderId} · placed {new Date(tracking.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                {live && <span className="flex items-center gap-1.5 text-xs text-green-700"><span className="h-2 w-2 animate-pulse rounded-full bg-green-600" /> Live</span>}
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusStyle[tracking.status]}`}>{tracking.status}</span>
              </div>
            </div>

            {!closed && (
              <ol className="mt-8 grid grid-cols-4 gap-2">
                {STEPS.map((step, index) => {
                  const done = index <= stepIndex;
                  return (
                    <li key={step.status} className="text-center">
                      <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm ${done ? "bg-black text-white" : "bg-gray-200 text-gray-500"}`}>{done ? "✓" : index + 1}</div>
                      <p className={`mt-2 text-xs ${done ? "font-medium text-gray-900" : "text-gray-400"}`}>{step.label}</p>
                    </li>
                  );
                })}
              </ol>
            )}

            {tracking.courier && (
              <div className="mt-8 rounded-lg bg-gray-50 p-4 text-sm">
                <p>Courier: <b>{tracking.courier.name}</b> · Parcel code <span className="font-mono">{tracking.courier.trackingCode}</span></p>
                {tracking.courier.trackUrl && <a href={tracking.courier.trackUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block underline underline-offset-4">Track on the courier website</a>}
              </div>
            )}

            <div className="mt-8 rounded-xl border border-gray-200 p-5">
              {tracking.items.map((item) => (
                <div key={`${item.name}-${item.size}-${item.color}`} className="flex gap-3 py-2">
                  <img src={item.image} alt="" className="h-14 w-12 rounded object-cover" />
                  <p className="flex-1 text-sm"><span className="font-medium">{item.name}</span><br /><span className="text-xs text-gray-500">{item.size} · {item.color} · Qty {item.quantity}</span></p>
                </div>
              ))}
              <p className="mt-3 flex justify-between border-t pt-3 text-sm">
                <span className="text-gray-500">Delivering to {tracking.city} · {tracking.paymentMethod === "cod" ? "Cash on delivery" : tracking.paymentStatus === "paid" ? "Paid" : "Payment " + tracking.paymentStatus.replace("_", " ")}</span>
                <b>{money(tracking.total)}</b>
              </p>
            </div>

            <h2 className="mt-10 text-lg font-semibold">Updates</h2>
            <ul className="mt-4 space-y-4 border-l-2 border-gray-200 pl-5">
              {[...tracking.history].reverse().map((event, index) => (
                <li key={event.at + index} className="relative">
                  <span className={`absolute top-1.5 -left-6.5 h-3 w-3 rounded-full ${index === 0 ? "bg-black" : "bg-gray-300"}`} />
                  <p className="text-sm font-medium">{event.note}</p>
                  <p className="text-xs text-gray-500">{new Date(event.at).toLocaleString()}</p>
                </li>
              ))}
            </ul>

            <div className="mt-10 rounded-lg border border-gray-200 p-4 text-sm">
              <p className="font-medium">Need your invoice?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone number used for the order" className="h-10 min-w-0 flex-1 rounded-md border border-gray-200 px-3 outline-none focus:border-black" />
                <Link href={`/invoice/${tracking.trackingId}?phone=${encodeURIComponent(phone)}`} className="inline-flex h-10 items-center rounded-md border border-black px-4">Open invoice</Link>
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
};

export default Track;
