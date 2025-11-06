
"use client";

import React, { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

/**
 * app/resend-verification/page.tsx
 *
 * - Keeps the original resend behavior (POST to /api/auth/resend-verification)
 * - Redesigned to match the dark/glass look used by the login & signup pages
 * - Keeps form behaviour intact and accessible
 */

export default function ResendVerificationPage(): React.ReactElement {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || data?.message || "Something went wrong");
      } else {
        setMessage(data?.message || "Verification email resent. Check your inbox.");
      }
    } catch (err) {
      console.error("Resend verification error:", err);
      setError((err as Error)?.message || "Failed to resend verification email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#061226] text-gray-100 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-lg">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-black/20 to-white/5 p-8 backdrop-blur-sm shadow-2xl">
            <header className="mb-4">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-indigo-300">Resend verification email</h1>
              <p className="mt-2 text-sm text-gray-400">
                Enter the email you signed up with and we&apos;ll resend the verification link.
              </p>
            </header>

            {message && (
              <div
                role="status"
                className="mb-4 p-3 rounded-md border border-green-700/20 bg-green-900/10 text-green-300 text-sm"
              >
                {message}
              </div>
            )}

            {error && (
              <div role="alert" className="mb-4 p-3 rounded-md border border-red-700/20 bg-red-900/10 text-red-300 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <label className="block">
                <span className="text-sm text-gray-300">Email</span>
                <input
                  id="email"
                  type="email"
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
                {loading ? "Resending..." : "Resend Email"}
              </button>
            </form>

            <div className="mt-6 text-sm text-gray-400">
              Remembered your password?{" "}
              <Link href="/login" className="text-indigo-300 hover:underline">
                Sign in
              </Link>
              {" — Need an account? "}
              <Link href="/signup" className="text-indigo-300 hover:underline">
                Create one
              </Link>
              {" — View "}
              <Link href="/pricing" className="text-indigo-300 hover:underline">
                plans
              </Link>
              .
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
