"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import Footer from "../components/Common/Footer";
import Header from "../components/Common/Header";
import { assets } from "../shared/assets";
import { api } from "../shared/api/client";
import { useNavigate } from "../shared/router";
import { useState } from "react";

const ForgotPassword = () => {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const contact = String(formData.get("contact") ?? "").trim();
    setError("");
    setMessage("");
    setBusy(true);
    api
      .forgotPassword(contact)
      .then((response) => {
        setMessage(response.message);
        // The 6-digit code is on its way; take the person straight to the page where they type it.
        navigate(`/reset-password?contact=${encodeURIComponent(contact)}`);
      })
      .catch((submissionError: Error) => setError(submissionError.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <Header />
      <main className="grid bg-white lg:grid-cols-2">
        <section className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-md rounded-md border border-gray-200 bg-white px-8 py-9 shadow-sm sm:px-9">
            <p className="text-center text-xl font-semibold tracking-tight">
              Rivowear
            </p>
            <h1 className="mt-7 text-center text-2xl font-bold tracking-tight">
              Forgot your password?
            </h1>
            <p className="mt-4 text-center text-base text-gray-900">
              Enter your email or phone number and we&apos;ll send you a 6-digit code.
            </p>

            <form className="mt-7" onSubmit={handleSubmit}>
              <label
                htmlFor="reset-contact"
                className="block text-sm font-semibold text-gray-900"
              >
                Email or phone number
              </label>
              <input
                id="reset-contact"
                name="contact"
                type="text"
                autoComplete="username"
                placeholder="Enter your email or phone number"
                required
                className="mt-2 h-11 w-full rounded-sm border border-gray-200 px-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
              />
              {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
              {error && <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="mt-5 h-11 w-full rounded-md bg-black text-sm font-semibold text-white transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-60"
              >
                {busy ? "Sending..." : "Send Code"}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-gray-900">
              Already have a code?{" "}
              <Link href="/reset-password" className="font-medium underline underline-offset-2 hover:text-gray-600">
                Enter it here
              </Link>
            </p>
            <p className="mt-3 text-center text-sm text-gray-900">
              Remember your password?{" "}
              <Link
                href="/login"
                className="font-medium underline underline-offset-2 hover:text-gray-600"
              >
                Back to sign in
              </Link>
            </p>
          </div>
        </section>

        <div className="hidden min-h-135 lg:block">
          <img
            src={assets.login}
            alt="Woman wearing a grey coat outside a storefront"
            className="h-full w-full object-cover object-center"
          />
        </div>
      </main>
      <Footer />
    </>
  );
};

export default ForgotPassword;
