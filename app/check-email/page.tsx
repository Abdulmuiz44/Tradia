
"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function CheckEmailPage(): React.ReactElement {
  const params = useSearchParams();
  const email = params?.get("email") ?? "";

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-white dark:bg-[#061226] text-gray-900 dark:text-gray-100 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-xl">
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gradient-to-br dark:from-black/20 dark:to-white/5 p-8 dark:backdrop-blur-sm shadow-lg dark:shadow-2xl">
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-indigo-300">Check your email</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-prose">
                We&apos;ve sent a verification link to the address below. Open that email and click the link to complete
                your registration.
              </p>
            </div>

            <div className="mt-4 p-4 rounded-lg border border-gray-200 dark:border-white/6 bg-gray-50 dark:bg-transparent">
              <div className="text-sm text-gray-600 dark:text-gray-300">Verification sent to</div>
              <div className="mt-2 text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 break-words">{email || "—"}</div>
            </div>

            <div className="mt-6 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Didn&apos;t receive the email? It can sometimes take a minute. Check your spam folder, and if you still
                can&apos;t find it try one of the options below.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center col-span-1 sm:col-span-1 w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-transparent text-center text-sm font-medium text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  Go to sign in
                </Link>

                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center col-span-1 sm:col-span-1 w-full px-4 py-2 rounded-lg bg-blue-600 dark:bg-indigo-500 hover:bg-blue-700 dark:hover:bg-indigo-600 text-white text-sm font-medium"
                >
                  Create another account
                </Link>

                <button
                  onClick={() => {
                    // a harmless client-side hint-only handler: actual resend should be handled on the server
                    // keep this silent to avoid errors if not implemented.
                    try {
                      fetch("/api/auth/resend-verification", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email }),
                      }).catch(() => {
                        /* ignore network errors here — server may not implement this route yet */
                      });
                    } catch {
                      /* ignore */
                    }
                    alert("If a resend endpoint exists, we attempted to request another verification email.");
                  }}
                  className="inline-flex items-center justify-center col-span-1 sm:col-span-1 w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-transparent text-sm font-medium text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  Resend email
                </button>
              </div>
            </div>

            <div className="mt-6 text-xs text-gray-500 dark:text-gray-500">
              If you continue to experience issues, contact{" "}
              <Link href="/signup" className="text-blue-600 dark:text-indigo-300 hover:underline">
                support
              </Link>{" "}
              or try again later.
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
