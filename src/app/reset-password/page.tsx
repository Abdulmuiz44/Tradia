// src/app/reset-password/page.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useSearchParams();

  // params may be null — use optional chaining to avoid "possibly null" errors
  const token = params?.get("token") ?? ""; // adjust if your query uses a different key

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

      const json: unknown = await res.json();

      if (!res.ok) {
        const errMsg =
          (typeof json === "object" && json !== null && "error" in json
            ? String((json as { error?: unknown }).error ?? "")
            : "") || "Reset failed";
        throw new Error(errMsg);
      }

      setMessage("Password updated. You can now sign in.");
      // small delay for UX, then redirect
      setTimeout(() => router.push("/login"), 900);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Reset request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4 py-10">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl p-6 shadow">
        <h1 className="text-2xl font-bold text-center text-indigo-600 dark:text-indigo-400">
          Reset Password
        </h1>

        {error && (
          <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
            {error}
          </div>
        )}
        {message && (
          <div className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            aria-label="New password"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            aria-label="Confirm new password"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Updating…" : "Set New Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
