
"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FcGoogle } from "react-icons/fc";
import { signIn } from "next-auth/react";
// Client-only Navbar/Footer to prevent SSR hydration issues
const Navbar = dynamic(() => import("@/components/Navbar"), { ssr: false });
const Footer = dynamic(() => import("@/components/Footer"), { ssr: false });

/**
 * app/login/page.tsx
 *
 * - Keeps original form logic and behavior exactly (remember-me, localStorage, submit flow).
 * - Redesigned to match landing page look & feel (dark glass panels, consistent spacing).
 * - Fixed robustness issues around localStorage access and fetch error handling.
 * - Do NOT add any leading/trailing non-code text when pasting this file into your project.
 */

function LoginPage(): React.ReactElement {
  const router = useRouter();

  const [form, setForm] = useState({ email: "", password: "" });
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load remembered email (defensive: guard localStorage access)
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const saved = localStorage.getItem("tradia_remember_email");
        if (saved) {
          setForm((f) => ({ ...f, email: saved }));
          setRemember(true);
        }
      }
    } catch {
      // ignore storage access errors (e.g. strict privacy mode)
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const toggleRemember = () => {
    const newVal = !remember;
    setRemember(newVal);
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        if (newVal && form.email) {
          localStorage.setItem("tradia_remember_email", form.email);
        } else {
          localStorage.removeItem("tradia_remember_email");
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    try {
      if (remember && form.email && typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem("tradia_remember_email", form.email);
      }
    } catch {
      // ignore localStorage errors
    }
  }, [form.email, remember]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!form.email || !form.password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.ok) {
        // Remember email if chosen
        try {
          if (typeof window !== "undefined" && window.localStorage) {
            if (remember) localStorage.setItem("tradia_remember_email", form.email);
            else localStorage.removeItem("tradia_remember_email");
          }
        } catch {
          // ignore
        }

        // Success - navigate to overview dashboard (allow data to sync)
        router.push("/dashboard/overview");
      } else {
        setError(result?.error || "Login failed.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError((err as Error)?.message || "Login request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-white text-black dark:bg-[#0f1319] dark:text-gray-100 transition-colors flex items-center justify-center py-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-3xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* Left — marketing / reassurance (matches landing visual style) */}
            <aside className="hidden md:flex flex-col justify-between rounded-2xl border border-gray-300 dark:border-white/10 bg-white dark:bg-gradient-to-br dark:from-black/20 dark:to-white/5 p-8 dark:backdrop-blur-sm">
              <div>
                <h1 className="text-2xl font-extrabold leading-tight text-black dark:text-white">Welcome back to Tradia</h1>
                <p className="mt-3 text-gray-700 dark:text-gray-300">
                  Sign in to access your dashboard, upload trade history, and get instant AI trade reviews.
                </p>

                <ul className="mt-6 space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-md bg-indigo-100 dark:bg-indigo-700/10 flex items-center justify-center text-indigo-700 dark:text-indigo-300">✓</span>
                    <div>
                      <div className="font-medium text-black dark:text-white">Secure & private</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">All data encrypted and for your eyes only.</div>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-md bg-indigo-100 dark:bg-indigo-700/10 flex items-center justify-center text-indigo-700 dark:text-indigo-300">⚡</span>
                    <div>
                      <div className="font-medium text-black dark:text-white">Fast insights</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Upload CSV or add trades manually and get instant feedback.</div>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
                New here?{" "}
                <Link href="/signup" className="text-indigo-700 dark:text-indigo-300 hover:underline">
                  Create an account
                </Link>
                {" — "}or view plans{" "}
                <Link href="/pricing" className="text-indigo-700 dark:text-indigo-300 hover:underline">
                  here
                </Link>
                .
              </div>
            </aside>

            {/* Right — form */}
            <section className="rounded-2xl border border-gray-300 dark:border-white/10 bg-white dark:bg-gradient-to-br dark:from-black/20 dark:to-white/5 p-8 dark:backdrop-blur-sm shadow-lg dark:shadow-2xl">
              <h2 className="text-3xl font-bold text-black dark:text-white">Sign in to Tradia</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Enter your credentials to continue to your dashboard.</p>

              {error && (
                <div className="mt-4 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
                <label className="block">
                  <span className="text-sm font-medium text-black dark:text-gray-300">Email</span>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="name@domain.com"
                    className="mt-2 w-full p-3 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-transparent text-black dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                    required
                    aria-label="Email Address"
                  />
                </label>

                <label className="block">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-black dark:text-gray-300">Password</span>
                    <Link href="/forgot-password" className="text-sm text-indigo-700 dark:text-indigo-300 hover:underline">
                      Forgot?
                    </Link>
                  </div>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Your password"
                    className="mt-2 w-full p-3 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-transparent text-black dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                    required
                    aria-label="Password"
                  />
                </label>

                <div className="flex items-center justify-between text-sm">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={toggleRemember}
                      className="h-4 w-4 rounded bg-white dark:bg-transparent border-gray-400 dark:border-white/10 checked:bg-indigo-600 dark:checked:bg-indigo-500 checked:border-indigo-600 dark:checked:border-indigo-500"
                    />
                    <span className="text-sm text-black dark:text-gray-300">Remember me</span>
                  </label>

                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Need help?{" "}
                    <Link href="/signup" className="text-indigo-700 dark:text-indigo-300 hover:underline">
                      Contact support
                    </Link>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-white hover:bg-gray-200 text-black rounded-lg font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed border border-gray-300"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>

              <div className="my-4 flex items-center">
                <div className="flex-1 h-px bg-gray-300 dark:bg-white/6" />
                <div className="px-3 text-xs text-gray-600 dark:text-gray-400">OR</div>
                <div className="flex-1 h-px bg-gray-300 dark:bg-white/6" />
              </div>

              <button
                onClick={async () => { try { await signIn("google", { callbackUrl: "/dashboard/overview" }); } catch (e) { setError(e instanceof Error ? e.message : "Google sign-in failed"); } }}
                className="w-full flex items-center justify-center gap-3 py-3 border-2 border-black dark:border-white rounded-lg hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition text-black dark:text-white font-semibold"
                aria-label="Continue with Google"
              >
                <FcGoogle size={20} />
                <span>Continue with Google</span>
              </button>

              <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="text-indigo-700 dark:text-indigo-300 hover:underline">
                  Create one
                </Link>
              </p>
            </section>
          </div>
        </motion.div>
      </main>

      <Footer />
    </>
  );
}

// Export as client-only to eliminate SSR/CSR DOM mismatches on this page
export default dynamic(() => Promise.resolve(LoginPage), { ssr: false });
