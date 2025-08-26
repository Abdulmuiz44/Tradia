"use client";

import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function VerifyFailed(): React.ReactElement {
  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#061226] text-gray-100 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-xl">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-black/20 to-white/5 p-8 backdrop-blur-sm shadow-2xl">
            <header className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-red-600/10 border border-red-600/20">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm2.47-10.53a.75.75 0 10-1.06-1.06L10 8.94 8.59 7.41a.75.75 0 10-1.06 1.06L8.94 10l-1.41 1.41a.75.75 0 101.06 1.06L10 11.06l1.41 1.41a.75.75 0 101.06-1.06L11.06 10l1.41-1.41z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-red-400">Verification failed</h1>
                <p className="mt-2 text-sm text-gray-400 max-w-prose">
                  The verification link is invalid, already used, or has expired. Don&apos;t worry — we can get this fixed.
                </p>
              </div>
            </header>

            <div className="mt-6 p-4 rounded-lg border border-white/6 bg-transparent">
              <p className="text-sm text-gray-300">
                Try one of the options below to continue:
              </p>

              <ul className="mt-3 space-y-2 text-sm text-gray-300">
                <li>• Request a new verification email (via signup flow)</li>
                <li>• Ensure you used the latest email we sent to you</li>
                <li>• Contact support if the problem persists</li>
              </ul>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center col-span-1 w-full px-4 py-2 rounded-lg border border-white/10 bg-transparent text-center text-sm font-medium hover:bg-white/5"
              >
                Resend verification
              </Link>

              <Link
                href="/login"
                className="inline-flex items-center justify-center col-span-1 w-full px-4 py-2 rounded-lg bg-red-600/80 hover:bg-red-700 text-white text-sm font-medium"
              >
                Sign in (try again)
              </Link>

              <a
                href="mailto:support@tradia.app"
                className="inline-flex items-center justify-center col-span-1 w-full px-4 py-2 rounded-lg border border-white/10 bg-transparent text-center text-sm font-medium hover:bg-white/5"
              >
                Contact support
              </a>
            </div>

            <div className="mt-6 text-xs text-gray-500">
              If you signed up using a different email address, try checking that inbox or use the email you registered with.
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
