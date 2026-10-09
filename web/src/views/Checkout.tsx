"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "@/shared/router";
import Footer from "../components/Common/Footer";
import Header from "../components/Common/Header";
import { useCart } from "../context/useCart";
import { api, type Address, type CheckoutOptions, type PaymentMethod, type Quote } from "../shared/api/client";
import { useAuth } from "../shared/context/useAuth";
import { money } from "../shared/money";
import { LAST_PHONE_KEY } from "../shared/constants";

const input = "h-11 w-full rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-black";

const looksLikePhone = (value: string) => /^[+\d][\d\s-]{8,}$/.test(value);

const Checkout = () => {
  const navigate = useNavigate();
  const { cartProducts, clearCart } = useCart();
  const { token, user } = useAuth();

  const [options, setOptions] = useState<CheckoutOptions | null>(null);
  const [form, setForm] = useState({
    fullName: user?.name ?? "",
    phone: user && looksLikePhone(user.contact) ? user.contact : "",
    email: user && user.contact.includes("@") ? user.contact : "",
    address: "",
    city: "",
    postalCode: "",
    note: "",
  });
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [trxId, setTrxId] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState("");
  const [couponError, setCouponError] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Phone check for Cash on Delivery (only when the shop turns it on). The proof belongs to ONE number.
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpInfo, setOtpInfo] = useState("");
  const [otpError, setOtpError] = useState("");
  const [verified, setVerified] = useState<{ phone: string; proof: string } | null>(null);

  const lines = useMemo(
    () => cartProducts.map(({ productId, size, color, quantity }) => ({ productId, size, color, quantity })),
    [cartProducts],
  );
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressChoice, setAddressChoice] = useState(""); // id of the saved address in use; "" = typed by hand
  const [saveAddress, setSaveAddress] = useState(true);

  const useAddress = (address: Address) => {
    setAddressChoice(address.id);
    setForm((current) => ({ ...current, fullName: address.fullName, phone: address.phone, address: address.address, city: address.city, postalCode: address.postalCode }));
  };

  // Logged-in customers get their default address filled in automatically.
  useEffect(() => {
    if (!token) return;
    api.addresses(token).then(({ addresses: saved }) => {
      setAddresses(saved);
      const preferred = saved.find((item) => item.isDefault);
      if (preferred) {
        setAddressChoice(preferred.id);
        setForm((current) => (current.address ? current : { ...current, fullName: preferred.fullName, phone: preferred.phone, address: preferred.address, city: preferred.city, postalCode: preferred.postalCode }));
      }
    }).catch(() => undefined);
  }, [token]);

  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    api.checkoutOptions().then((response) => {
      setOptions(response);
      setMethod((current) => current || (response.cod ? "cod" : response.online ? "sslcommerz" : response.bkash ? "bkash_manual" : response.nagad ? "nagad_manual" : ""));
    }).catch((requestError: Error) => setError(requestError.message));
  }, []);

  // Delivery fee and discount are always calculated by the server.
  useEffect(() => {
    if (lines.length === 0) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      api
        .quote(lines, form.city, coupon)
        .then((response) => {
          if (cancelled) return;
          setQuote(response);
          setCouponError("");
        })
        .catch((requestError: Error) => {
          if (cancelled) return;
          if (coupon) {
            setCouponError(requestError.message);
            setCoupon("");
          } else {
            setError(requestError.message);
          }
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [lines, form.city, coupon]);

  const needsPhoneCheck = Boolean(options?.phoneVerification) && method === "cod";
  const phoneVerified = verified !== null && verified.phone === form.phone.trim();

  const sendOtpCode = () => {
    setOtpError("");
    setOtpInfo("");
    setOtpBusy(true);
    api
      .sendCheckoutOtp(form.phone.trim())
      .then((response) => {
        setOtpSent(true);
        setOtpInfo(response.message);
      })
      .catch((requestError: Error) => setOtpError(requestError.message))
      .finally(() => setOtpBusy(false));
  };

  const confirmOtpCode = () => {
    setOtpError("");
    setOtpBusy(true);
    api
      .verifyCheckoutOtp(form.phone.trim(), otpCode.trim())
      .then(({ phoneProof }) => {
        setVerified({ phone: form.phone.trim(), proof: phoneProof });
        setOtpCode("");
        setOtpInfo("");
      })
      .catch((requestError: Error) => setOtpError(requestError.message))
      .finally(() => setOtpBusy(false));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!method) {
      setError("Please choose a payment method.");
      return;
    }
    if (needsPhoneCheck && !phoneVerified) {
      setError("Please confirm your mobile number with the SMS code first.");
      return;
    }
    setError("");
    setBusy(true);
    api
      .placeOrder(
        {
          items: lines,
          shipping: {
            fullName: form.fullName,
            phone: form.phone,
            email: form.email || undefined,
            address: form.address,
            city: form.city,
            postalCode: form.postalCode || undefined,
            note: form.note || undefined,
          },
          paymentMethod: method,
          couponCode: coupon || undefined,
          manualPayment: method === "bkash_manual" || method === "nagad_manual" ? { trxId, senderNumber } : undefined,
          phoneProof: needsPhoneCheck && verified ? verified.proof : undefined,
        },
        token,
      )
      .then(async ({ order, paymentUrl }) => {
        sessionStorage.setItem(LAST_PHONE_KEY, order.shipping.phone);
        // Remember a newly typed address for the next order (never blocks the order if it fails).
        if (token && saveAddress && !addressChoice) {
          await api.addAddress(token, { label: addresses.length === 0 ? "Home" : "Other", fullName: form.fullName, phone: order.shipping.phone, address: form.address, city: form.city, postalCode: form.postalCode }).catch(() => undefined);
        }
        clearCart();
        if (paymentUrl) {
          window.location.href = paymentUrl;
          return;
        }
        navigate(`/order-success?tracking=${order.trackingId}`);
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setBusy(false));
  };

  if (cartProducts.length === 0) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h1 className="text-3xl font-semibold">Your cart is empty</h1>
          <p className="mt-3 text-gray-500">Add products before checking out.</p>
          <Link href="/shop" className="mt-7 inline-flex rounded-md bg-black px-6 py-3 text-sm font-medium text-white">Continue shopping</Link>
        </main>
        <Footer />
      </>
    );
  }

  const manual = method === "bkash_manual" ? options?.bkash : method === "nagad_manual" ? options?.nagad : null;
  const paymentChoices: { value: PaymentMethod; label: string; hint: string; show: boolean }[] = [
    { value: "cod", label: "Cash on delivery", hint: "Pay when the parcel arrives", show: Boolean(options?.cod) },
    { value: "sslcommerz", label: "Pay online (bKash, Nagad, card, bank)", hint: "You will be taken to a secure payment page", show: Boolean(options?.online) },
    { value: "bkash_manual", label: "bKash (send money)", hint: "Send money, then enter the transaction ID", show: Boolean(options?.bkash) },
    { value: "nagad_manual", label: "Nagad (send money)", hint: "Send money, then enter the transaction ID", show: Boolean(options?.nagad) },
  ];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <p className="text-sm text-gray-500">Secure checkout</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Complete your order</h1>
        {!token && (
          <p className="mt-3 rounded-md bg-gray-50 p-3 text-sm text-gray-600">
            No account needed. We&apos;ll SMS your tracking ID to the phone number below.{" "}
            <Link href="/login?from=%2Fcheckout"  className="font-medium underline">Log in</Link> to save your orders and write reviews.
          </p>
        )}
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-semibold">Delivery information</h2>
              {addresses.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600">Deliver to one of your saved addresses:</p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    {addresses.map((item) => (
                      <button key={item.id} type="button" onClick={() => useAddress(item)} aria-pressed={addressChoice === item.id} className={`rounded-md border p-3 text-left text-sm ${addressChoice === item.id ? "border-black ring-1 ring-black" : "border-gray-200 hover:border-gray-400"}`}>
                        <span className="font-medium">{item.label}</span>{item.isDefault && <span className="ml-2 text-xs text-gray-500">Default</span>}
                        <span className="block text-gray-600">{item.fullName}, {item.address}, {item.city}</span>
                      </button>
                    ))}
                    <button type="button" onClick={() => { setAddressChoice(""); setForm((current) => ({ ...current, address: "", city: "", postalCode: "" })); }} aria-pressed={addressChoice === ""} className={`rounded-md border p-3 text-left text-sm ${addressChoice === "" ? "border-black ring-1 ring-black" : "border-dashed border-gray-300 hover:border-gray-500"}`}>+ Use a different address</button>
                  </div>
                </div>
              )}
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <input required name="fullName" autoComplete="name" placeholder="Full name" value={form.fullName} onChange={(event) => set("fullName", event.target.value)} className={input} />
                <input required name="phone" type="tel" autoComplete="tel" placeholder="Mobile number (01XXXXXXXXX)" value={form.phone} onChange={(event) => set("phone", event.target.value)} className={input} />
                <input name="email" type="email" autoComplete="email" placeholder="Email (optional)" value={form.email} onChange={(event) => set("email", event.target.value)} className={`${input} sm:col-span-2`} />
                <input required name="address" autoComplete="street-address" placeholder="Full address (house, road, area)" value={form.address} onChange={(event) => set("address", event.target.value)} className={`${input} sm:col-span-2`} />
                <input required name="city" placeholder="City / District (e.g. Dhaka)" value={form.city} onChange={(event) => set("city", event.target.value)} className={input} />
                <input name="postalCode" placeholder="Postal code (optional)" value={form.postalCode} onChange={(event) => set("postalCode", event.target.value)} className={input} />
                <textarea name="note" rows={2} maxLength={300} placeholder="Note for delivery (optional)" value={form.note} onChange={(event) => set("note", event.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black sm:col-span-2" />
              </div>
              {token && !addressChoice && addresses.length < 10 && (
                <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={saveAddress} onChange={(event) => setSaveAddress(event.target.checked)} /> Save this address for my next order
                </label>
              )}
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-semibold">Payment method</h2>
              <div className="mt-5 space-y-3">
                {paymentChoices.filter((choice) => choice.show).map((choice) => (
                  <label key={choice.value} className={`flex cursor-pointer items-start gap-3 rounded-md border p-4 text-sm ${method === choice.value ? "border-black" : "border-gray-200"}`}>
                    <input type="radio" name="payment" className="mt-1" checked={method === choice.value} onChange={() => setMethod(choice.value)} />
                    <span><span className="block font-medium">{choice.label}</span><span className="text-xs text-gray-500">{choice.hint}</span></span>
                  </label>
                ))}
                {options && !paymentChoices.some((choice) => choice.show) && <p className="text-sm text-red-600">No payment method is available right now. Please contact us.</p>}
              </div>
              {manual && (
                <div className="mt-4 rounded-md bg-amber-50 p-4 text-sm">
                  <p>Send <b>{money(quote?.total ?? 0)}</b> to <b>{manual.number}</b> ({method === "bkash_manual" ? "bKash" : "Nagad"} Send Money), then fill in:</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input required placeholder="Transaction ID (TrxID)" value={trxId} onChange={(event) => setTrxId(event.target.value)} className={input} />
                    <input required type="tel" placeholder="Number you sent from" value={senderNumber} onChange={(event) => setSenderNumber(event.target.value)} className={input} />
                  </div>
                  <p className="mt-2 text-xs text-gray-600">We confirm your payment manually, then ship your order.</p>
                </div>
              )}
              {needsPhoneCheck && (
                <div className="mt-4 rounded-md border border-gray-200 p-4 text-sm">
                  <p className="font-medium">Confirm your mobile number</p>
                  <p className="mt-1 text-xs text-gray-500">For Cash on Delivery we send a 6-digit code to <b>{form.phone || "your number"}</b> to make sure the order is real.</p>
                  {phoneVerified ? (
                    <p className="mt-3 text-green-700">✓ Number confirmed. You can place your order.</p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {otpSent && (
                        <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-digit code" value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ""))} className="h-10 w-36 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-black" />
                      )}
                      {otpSent && (
                        <button type="button" disabled={otpBusy || otpCode.length !== 6} onClick={confirmOtpCode} className="h-10 rounded-md bg-black px-4 text-sm font-medium text-white disabled:opacity-60">Confirm</button>
                      )}
                      <button type="button" disabled={otpBusy || !form.phone.trim()} onClick={sendOtpCode} className="h-10 rounded-md border border-black px-4 text-sm disabled:opacity-60">{otpSent ? "Send again" : "Send code"}</button>
                    </div>
                  )}
                  {otpInfo && !phoneVerified && <p className="mt-2 text-xs text-gray-600">{otpInfo}</p>}
                  {otpError && <p className="mt-2 text-xs text-red-600" role="alert">{otpError}</p>}
                </div>
              )}
            </section>

            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <button type="submit" disabled={busy || !method} className="h-12 w-full rounded-md bg-black text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60">
              {busy ? "Placing order..." : method === "sslcommerz" ? "Continue to payment" : "Place order"}
            </button>
          </form>

          <aside className="h-fit rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold">Order summary</h2>
            <div className="mt-5 space-y-4">
              {cartProducts.map((item) => (
                <div key={`${item.productId}-${item.size}-${item.color}`} className="flex gap-3">
                  <img src={item.image} alt="" className="h-16 w-14 rounded object-cover" />
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.name}</p><p className="text-xs text-gray-500">{item.size} · {item.color} · Qty {item.quantity}</p></div>
                  <p className="text-sm font-medium">{money(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex gap-2">
              <input placeholder="Coupon code" value={couponInput} onChange={(event) => setCouponInput(event.target.value)} className="h-10 min-w-0 flex-1 rounded-md border border-gray-200 px-3 text-sm uppercase outline-none focus:border-black" />
              <button type="button" onClick={() => { setCouponError(""); setCoupon(couponInput.trim()); }} className="rounded-md border border-black px-4 text-sm">Apply</button>
            </div>
            {couponError && <p className="mt-2 text-xs text-red-600">{couponError}</p>}
            {quote?.couponCode && <p className="mt-2 text-xs text-green-700">Coupon {quote.couponCode} applied.</p>}
            <div className="mt-6 space-y-2 border-t pt-4 text-sm text-gray-600">
              <div className="flex justify-between"><span>Subtotal</span><span>{quote ? money(quote.subtotal) : "..."}</span></div>
              {quote && quote.discount > 0 && <div className="flex justify-between text-green-700"><span>Discount</span><span>-{money(quote.discount)}</span></div>}
              <div className="flex justify-between"><span>Delivery</span><span>{quote ? (quote.shippingFee === 0 ? "Free" : money(quote.shippingFee)) : "..."}</span></div>
              <div className="flex justify-between border-t pt-3 text-lg font-semibold text-gray-950"><span>Total</span><span>{quote ? money(quote.total) : "..."}</span></div>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Checkout;
