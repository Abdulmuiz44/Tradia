"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

/**
 * src/app/reset-password/page.tsx
 *
 * - Redesigned to match Login/Signup pages (dark glass panels, consistent spacing & styles)
 * - Keeps all original behavior intact:
 *   - Reads `token` from query string
 *   - Validates passwords locally (matching, min length)
 *   - POSTs to /api/auth/reset-password with { token, password }
 *   - Shows errors/messages and redirects to /login on success
 *
 * Return type uses React.ReactElement to avoid depending on the JSX namespace.
 */

export default function ResetPasswordPage(): React.ReactElement {
  const router = useRouter();
  const params = useSearchParams();

  const token = params?.get("token") ?? "";

  const [password, setPassword] = useState<string>("");
  const [confirm, setConfirm] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!token) {
      setError("Invalid or missing reset token.");
      return;
    }
    if (!password || !confirm) {
      setError("Please enter and confirm your new password.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const json: unknown = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errMsg =
          (typeof json === "object" && json !== null && "error" in json
            ? String((json as { error?: unknown }).error ?? "")
            : "") || "Reset failed";
        throw new Error(errMsg);
      }

      setMessage("Password updated. Redirecting to sign in...");
      // short delay for UX then redirect
      setTimeout(() => router.push("/login"), 900);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Reset request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#061226] text-gray-100 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-black/20 to-white/5 p-8 backdrop-blur-sm shadow-2xl">
            <header className="mb-4">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-indigo-300">Set a new password</h1>
              <p className="mt-2 text-sm text-gray-400">
                Enter a strong password (minimum 8 characters) to update your account.
              </p>
            </header>

            {error && (
              <div role="alert" className="mb-4 p-3 rounded-md border border-red-700/20 bg-red-900/10 text-red-300 text-sm">
                {error}
              </div>
            )}

            {message && (
              <div role="status" className="mb-4 p-3 rounded-md border border-green-700/20 bg-green-900/10 text-green-300 text-sm">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <label className="block">
                <span className="text-sm text-gray-300">New password</span>
                <input
                  type="password"
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full p-3 rounded-lg border border-white/10 bg-transparent text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                  aria-label="New password"
                />
              </label>

              <label className="block">
                <span className="text-sm text-gray-300">Confirm new password</span>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="mt-2 w-full p-3 rounded-lg border border-white/10 bg-transparent text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                  aria-label="Confirm new password"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Updating…" : "Set New Password"}
              </button>
            </form>

            <div className="mt-6 text-sm text-gray-400">
              Remembered your password?{" "}
              <Link href="/login" className="text-indigo-300 hover:underline">
                Sign in
              </Link>
              {" — Need a new link? "}
              <Link href="/resend-verification" className="text-indigo-300 hover:underline">
                Resend verification
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
