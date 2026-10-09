"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useSearchParams } from "@/shared/router";
import Footer from "../components/Common/Footer";
import Header from "../components/Common/Header";
import { api } from "../shared/api/client";

const inputClass =
  "mt-2 h-11 w-full rounded-sm border border-gray-200 px-3 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900";

const ResetPassword = () => {
  const [params] = useSearchParams();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const contact = String(form.get("contact") ?? "").trim();
    const code = String(form.get("code") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirm") ?? "")) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    api
      .resetPassword(contact, code, password)
      .then((response) => setMessage(response.message))
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <Header />
      <main className="flex justify-center px-5 py-14">
        <div className="w-full max-w-md rounded-md border border-gray-200 px-8 py-9 shadow-sm">
          <h1 className="text-center text-2xl font-bold tracking-tight">Reset password</h1>
          {params.get("contact") && (
            <p className="mt-3 text-center text-sm text-gray-700">If an account exists for this contact, we sent a 6-digit code. It works for 10 minutes.</p>
          )}
          <form onSubmit={handleSubmit} className="mt-7">
            <label className="block text-sm font-semibold">
              Email or phone number
              <input name="contact" required autoComplete="username" defaultValue={params.get("contact") ?? ""} className={inputClass} />
            </label>
            <label className="mt-5 block text-sm font-semibold">
              6-digit code
              <input name="code" required inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} placeholder="123456" className={inputClass} />
            </label>
            <label className="mt-5 block text-sm font-semibold">
              New password
              <input name="password" type="password" required autoComplete="new-password" placeholder="8+ characters, letters and numbers" className={inputClass} />
            </label>
            <label className="mt-5 block text-sm font-semibold">
              Confirm password
              <input name="confirm" type="password" required autoComplete="new-password" className={inputClass} />
            </label>
            {message && <p className="mt-3 text-sm text-green-600">{message}</p>}
            {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
            <button type="submit" disabled={busy} className="mt-5 h-11 w-full rounded-md bg-black text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60">
              {busy ? "Updating..." : "Update password"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm">
            <Link href="/login" className="font-medium underline underline-offset-2">Back to sign in</Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default ResetPassword;
