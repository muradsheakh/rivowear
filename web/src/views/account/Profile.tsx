"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, type AccountStats } from "../../shared/api/client";
import { useAuth } from "../../shared/context/useAuth";
import { money } from "../../shared/money";

const input = "mt-1 h-11 w-full rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-black";
const card = "rounded-xl border border-gray-200 bg-white p-6";

const Profile = () => {
  const { token, user, updateSession } = useAuth();
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [form, setForm] = useState<{ name: string; email: string; phone: string } | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [claim, setClaim] = useState({ trackingId: "", phone: "" });
  const [claimMessage, setClaimMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!token) return;
    api.account(token).then(({ user: fresh, stats: counts }) => {
      setStats(counts);
      setForm({ name: fresh.name, email: fresh.email ?? "", phone: fresh.phone ?? "" });
    }).catch((requestError: Error) => setError(requestError.message));
  }, [token]);

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!token || !form) return;
    setBusy(true);
    setMessage("");
    setError("");
    api.updateProfile(token, form)
      .then(({ user: updated }) => {
        updateSession({ user: updated });
        setMessage("Your profile was saved.");
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setBusy(false));
  };

  const claimOrder = (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setClaimMessage(null);
    api.claimOrder(token, claim.trackingId, claim.phone)
      .then(({ order }) => {
        setClaimMessage({ ok: true, text: `Order ${order.orderId} was added to your account. You can find it under My orders.` });
        setClaim({ trackingId: "", phone: "" });
        api.account(token).then((response) => setStats(response.stats)).catch(() => undefined);
      })
      .catch((requestError: Error) => setClaimMessage({ ok: false, text: requestError.message }));
  };

  if (!form) return <p className="text-sm text-gray-500">{error || "Loading your profile..."}</p>;

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            ["Orders", String(stats.orders)],
            ["Delivered", String(stats.delivered)],
            ["Total spent", money(stats.spent)],
            ["Reviews", String(stats.reviews)],
            ["Wishlist", String(stats.wishlist)],
            ["Saved addresses", String(stats.addresses)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="mt-1 text-xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={save} className={card}>
        <h2 className="text-lg font-semibold">Personal details</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium sm:col-span-2">
            Full name
            <input required minLength={2} maxLength={80} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoComplete="name" className={input} />
          </label>
          <label className="text-sm font-medium">
            Email
            <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="email" placeholder="you@example.com" className={input} />
          </label>
          <label className="text-sm font-medium">
            Mobile number
            <input type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} autoComplete="tel" placeholder="01XXXXXXXXX" className={input} />
          </label>
        </div>
        <p className="mt-3 text-xs text-gray-500">You can log in with either your email or your mobile number. Order SMS go to the number you give at checkout.</p>
        {message && <p className="mt-4 text-sm text-green-700" role="status">{message}</p>}
        {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}
        <button type="submit" disabled={busy} className="mt-5 rounded-md bg-black px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60">{busy ? "Saving..." : "Save changes"}</button>
        {user?.createdAt && <p className="mt-4 text-xs text-gray-400">Member since {new Date(user.createdAt).toLocaleDateString()}</p>}
      </form>

      <form onSubmit={claimOrder} className={card}>
        <h2 className="text-lg font-semibold">Add an earlier order</h2>
        <p className="mt-1 text-sm text-gray-600">Ordered before without logging in? Enter its tracking ID and the phone number you used. The order moves into your account, so you can track it here and review the products once delivered.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input required placeholder="Tracking ID (e.g. RWK7M2QX9P)" value={claim.trackingId} onChange={(event) => setClaim({ ...claim, trackingId: event.target.value })} className="h-11 rounded-md border border-gray-200 px-3 font-mono text-sm uppercase outline-none focus:border-black" aria-label="Tracking ID" />
          <input required type="tel" placeholder="Phone used for the order" value={claim.phone} onChange={(event) => setClaim({ ...claim, phone: event.target.value })} className="h-11 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-black" aria-label="Phone number" />
          <button type="submit" className="h-11 rounded-md border border-black px-5 text-sm font-medium">Add order</button>
        </div>
        {claimMessage && <p className={`mt-3 text-sm ${claimMessage.ok ? "text-green-700" : "text-red-600"}`} role={claimMessage.ok ? "status" : "alert"}>{claimMessage.text}</p>}
      </form>
    </div>
  );
};

export default Profile;
