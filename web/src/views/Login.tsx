"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { safePath, useNavigate, useSearchParams } from "@/shared/router";
import AuthSocialButtons from "../shared/components/AuthSocialButtons";
import { assets } from "../shared/assets";
import Footer from "../components/Common/Footer";
import Header from "../components/Common/Header";
import { useAuth } from "../shared/context/useAuth";

const Login = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const from = safePath(params.get("from"));
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const contact = String(formData.get("contact") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    setIsSubmitting(true);
    setError("");
    login(contact, password)
      .then((user) => navigate(from ?? (user.role === "admin" ? "/admin" : "/"), { replace: true }))
      .catch((submissionError: Error) => setError(submissionError.message))
      .finally(() => setIsSubmitting(false));
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
              Hey there! <span aria-hidden="true">👋</span>
            </h1>
            <p className="mt-6 text-center text-base text-gray-900">
              Enter your username and password to Login.
            </p>

            <form className="mt-7" onSubmit={handleSubmit}>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-gray-900"
              >
                Email or phone
              </label>
              <input
                id="contact"
                name="contact"
                type="text"
                autoComplete="username"
                placeholder="Enter your email or phone number"
                required
                className="mt-2 h-11 w-full rounded-sm border border-gray-200 px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
              />

              <label
                htmlFor="password"
                className="mt-5 block text-sm font-semibold text-gray-900"
              >
                <span>Password</span>
                <Link
                  href="/forgot-password"
                  className="float-right font-normal underline underline-offset-2 hover:text-gray-600"
                >
                  Forgot password?
                </Link>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                required
                className="mt-2 h-11 w-full rounded-sm border border-gray-200 px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
              />
              {error && (
                <p className="mt-2 text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="mt-4 h-11 w-full rounded-md bg-black text-sm font-semibold text-white transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
              >
                {isSubmitting ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <AuthSocialButtons action="sign in" />
            <p className="mt-7 text-center text-sm text-gray-900">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-medium underline underline-offset-2 hover:text-gray-600"
              >
                Register
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

export default Login;