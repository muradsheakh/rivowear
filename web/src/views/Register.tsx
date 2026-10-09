"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "@/shared/router";
import AuthSocialButtons from "../shared/components/AuthSocialButtons";
import { assets } from "../shared/assets";
import Footer from "../components/Common/Footer";
import Header from "../components/Common/Header";
import { useAuth } from "../shared/context/useAuth";

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    register(
      String(formData.get("name") ?? "").trim(),
      String(formData.get("contact") ?? "").trim(),
      password,
    )
      .then(() => navigate("/login"))
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
              Create your account
            </h1>
            <p className="mt-4 text-center text-base text-gray-900">
              Sign up to start shopping with Rivowear.
            </p>

            <form className="mt-7" onSubmit={handleSubmit}>
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-gray-900"
              >
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Enter your full name"
                required
                className="mt-2 h-11 w-full rounded-sm border border-gray-200 px-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
              />

              <label
                htmlFor="register-contact"
                className="mt-5 block text-sm font-semibold text-gray-900"
              >
                Email or phone number
              </label>
              <input
                id="register-contact"
                name="contact"
                type="text"
                autoComplete="username"
                placeholder="Enter your email or phone number"
                required
                className="mt-2 h-11 w-full rounded-sm border border-gray-200 px-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
              />

              <label
                htmlFor="register-password"
                className="mt-5 block text-sm font-semibold text-gray-900"
              >
                Password
              </label>
              <input
                id="register-password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="8+ characters, letters and numbers"
                required
                className="mt-2 h-11 w-full rounded-sm border border-gray-200 px-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
              />

              <label
                htmlFor="confirm-password"
                className="mt-5 block text-sm font-semibold text-gray-900"
              >
                Confirm password
              </label>
              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Confirm your password"
                required
                className="mt-2 h-11 w-full rounded-sm border border-gray-200 px-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
              />

              {error && (
                <p className="mt-2 text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                className="mt-5 h-11 w-full rounded-md bg-black text-sm font-semibold text-white transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
              >
                {isSubmitting ? "Creating account..." : "Create Account"}
              </button>
            </form>

            <AuthSocialButtons action="sign up" />
            <p className="mt-7 text-center text-sm text-gray-900">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium underline underline-offset-2 hover:text-gray-600"
              >
                Sign in
              </Link>
            </p>
          </div>
        </section>

        <div className="hidden min-h-135 lg:block">
          <img
            src={assets.register}
            alt="Woman wearing a light outfit in a city"
            className="h-full w-full object-cover object-center"
          />
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Register;
