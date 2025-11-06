
"use client";

import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function VerifySuccess(): React.ReactElement {
  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#061226] text-gray-100 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-xl">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-black/20 to-white/5 p-8 backdrop-blur-sm shadow-2xl">
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-indigo-300">Email verified 🎉</h1>
              <p className="mt-2 text-sm text-gray-400 max-w-prose">
                Thanks — your email has been confirmed. Your account is now active and ready to use.
              </p>
            </div>

            <div className="mt-4 p-4 rounded-lg border border-white/6 bg-transparent">
              <div className="text-sm text-gray-300">What next</div>
              <div className="mt-2 text-base sm:text-lg font-medium text-gray-100">
                You can sign in to your account or jump straight to your dashboard.
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center col-span-1 w-full px-4 py-2 rounded-lg border border-white/10 bg-transparent text-center text-sm font-medium hover:bg-white/5"
              >
                Sign in
              </Link>

              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center col-span-1 w-full px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium"
              >
                Go to dashboard
              </Link>

              <Link
                href="/"
                className="inline-flex items-center justify-center col-span-1 w-full px-4 py-2 rounded-lg border border-white/10 bg-transparent text-center text-sm font-medium hover:bg-white/5"
              >
                Return home
              </Link>
            </div>

            <div className="mt-6 text-xs text-gray-500">
              If you have any trouble signing in, contact{" "}
              <Link href="/contact" className="text-indigo-300 hover:underline">
                support
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
