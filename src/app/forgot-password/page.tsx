"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

/**
 * app/forgot-password/page.tsx
 *
 * - Redesigned to match the Login / Signup pages (dark glass panels, consistent spacing).
 * - Keeps original behaviour: POST to /api/auth/forgot-password, shows server message.
 * - Uses React.ReactElement return type to avoid "Cannot find namespace 'JSX'" issues.
 */

export default function ForgotPasswordPage(): React.ReactElement {
  const [email, setEmail] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setIsError(false);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setIsError(true);
        setMessage((data && (data.error || data.message)) || "Failed to send reset link.");
      } else {
        setIsError(false);
        setMessage((data && (data.message || "Check your inbox for a reset link.")) || "Check your inbox for a reset link.");
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      setIsError(true);
      setMessage("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#061226] text-gray-100 flex items-center justify-center py-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36 }}
          className="w-full max-w-3xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* Left — reassurance / marketing (hidden on small screens) */}
            <aside className="hidden md:flex flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-br from-black/20 to-white/5 p-8 backdrop-blur-sm">
              <div>
                <h1 className="text-2xl font-extrabold leading-tight">Forgot your password?</h1>
                <p className="mt-3 text-gray-300">
                  No worries — enter your email and we’ll send a secure password reset link.
                </p>

                <ul className="mt-6 space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-md bg-indigo-700/10 flex items-center justify-center text-indigo-300">✓</span>
                    <div>
                      <div className="font-medium">Secure links</div>
                      <div className="text-sm text-gray-400">Reset tokens expire quickly for safety.</div>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-md bg-indigo-700/10 flex items-center justify-center text-indigo-300">🔒</span>
                    <div>
                      <div className="font-medium">Privacy first</div>
                      <div className="text-sm text-gray-400">We never share your email with third parties.</div>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="mt-6 text-sm text-gray-400">
                Remembered your password?{" "}
                <Link href="/login" className="text-indigo-300 hover:underline">
                  Sign in
                </Link>
                {" — "}or create a new account{" "}
                <Link href="/signup" className="text-indigo-300 hover:underline">
                  here
                </Link>
                .
              </div>
            </aside>

            {/* Right — form */}
            <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-black/20 to-white/5 p-8 backdrop-blur-sm shadow-2xl">
              <h2 className="text-3xl font-bold text-indigo-300">Reset your password</h2>
              <p className="mt-2 text-sm text-gray-400">Enter the email tied to your account and we'll send reset instructions.</p>

              {message && (
                <div
                  role={isError ? "alert" : "status"}
                  className={`mt-4 p-3 rounded-md text-sm ${isError ? "bg-red-900/10 border border-red-700 text-red-300" : "bg-green-900/10 border border-green-700 text-green-300"}`}
                >
                  {message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
                <label className="block">
                  <span className="text-sm text-gray-300">Email</span>
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="mt-2 w-full p-3 rounded-lg border border-white/10 bg-transparent text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                    aria-label="Email Address"
                  />
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>

              <div className="my-4 text-center text-sm text-gray-400">
                Or <Link href="/signup" className="text-indigo-300 hover:underline">create an account</Link> if you don't have one.
              </div>
            </section>
          </div>
        </motion.div>
      </main>

      <Footer />
    </>
  );
}
