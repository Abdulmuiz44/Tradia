
"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FcGoogle } from "react-icons/fc";
import { signIn } from "next-auth/react";
import { Shield, Zap, TrendingUp, Eye, EyeOff } from "lucide-react";

const Navbar = dynamic(() => import("@/components/Navbar"), { ssr: false });
const Footer = dynamic(() => import("@/components/Footer"), { ssr: false });

function LoginPage(): React.ReactElement {
  const router = useRouter();

  const [form, setForm] = useState({ email: "", password: "" });
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Load remembered email from cookie
  useEffect(() => {
    try {
      if (typeof document !== "undefined") {
        const match = document.cookie.match(/tradia_remember_email=([^;]+)/);
        if (match) {
          const saved = decodeURIComponent(match[1]);
          setForm((f) => ({ ...f, email: saved }));
          setRemember(true);
        }
      }
    } catch {
      // ignore
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
      if (typeof document !== "undefined") {
        if (newVal && form.email) {
          document.cookie = `tradia_remember_email=${encodeURIComponent(form.email)}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
        } else {
          document.cookie = "tradia_remember_email=; path=/; max-age=0";
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    try {
      if (remember && form.email && typeof document !== "undefined") {
        document.cookie = `tradia_remember_email=${encodeURIComponent(form.email)}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
      }
    } catch {
      // ignore
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
        try {
          if (typeof document !== "undefined") {
            if (remember) {
              document.cookie = `tradia_remember_email=${encodeURIComponent(form.email)}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
            } else {
              document.cookie = "tradia_remember_email=; path=/; max-age=0";
            }
          }
        } catch {
          // ignore
        }
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

  const features = [
    { icon: Shield, title: "Bank-Level Security", desc: "256-bit encryption protects your data" },
    { icon: Zap, title: "Instant AI Insights", desc: "Get trade analysis in seconds" },
    { icon: TrendingUp, title: "Performance Tracking", desc: "Monitor your edge over time" },
  ];

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-white dark:bg-[#0a0d12] flex items-center justify-center py-16 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-5xl"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden rounded-2xl border border-gray-200 dark:border-[#2a2f3a] shadow-xl dark:shadow-2xl">

            {/* Left Panel - Branding */}
            <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-[#0D1117] dark:via-[#161B22] dark:to-[#0D1117] relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-0 left-0 w-full h-full" style={{
                  backgroundImage: `radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.3) 0%, transparent 50%),
                                   radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.3) 0%, transparent 50%)`
                }} />
              </div>

              <div className="relative z-10">
                {/* Logo */}
                <div className="flex items-center gap-3 mb-12">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                    <Image src="/TRADIA-LOGO.png" alt="Tradia" width={24} height={24} className="w-6 h-6" />
                  </div>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">Tradia</span>
                </div>

                {/* Welcome Text */}
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                  Welcome back
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-10">
                  Sign in to continue your trading journey with AI-powered insights.
                </p>

                {/* Features */}
                <div className="space-y-6">
                  {features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 border border-gray-200 dark:border-[#2a2f3a] flex items-center justify-center flex-shrink-0">
                        <feature.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{feature.title}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-500">{feature.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom CTA */}
              <div className="relative z-10 pt-10 border-t border-gray-200 dark:border-[#2a2f3a] mt-10">
                <p className="text-gray-600 dark:text-gray-500 text-sm">
                  New to Tradia?{" "}
                  <Link href="/signup" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition font-medium">
                    Create an account
                  </Link>
                </p>
              </div>
            </div>

            {/* Right Panel - Form */}
            <div className="p-10 bg-white dark:bg-[#0D1117]">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Sign in to your account</h2>
                <p className="text-gray-600 dark:text-gray-500">Enter your credentials to access your dashboard</p>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs">!</span>
                  </div>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">Email address</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="name@company.com"
                    className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-[#161B22] border border-gray-300 dark:border-[#2a2f3a] text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-400">Password</label>
                    <Link href="/forgot-password" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-[#161B22] border border-gray-300 dark:border-[#2a2f3a] text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={remember}
                    onChange={toggleRemember}
                    className="w-4 h-4 rounded bg-gray-50 dark:bg-[#161B22] border-gray-300 dark:border-[#2a2f3a] text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <label htmlFor="remember" className="text-sm text-gray-600 dark:text-gray-400">
                    Remember me for 30 days
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black rounded-full animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </form>

              <div className="my-6 flex items-center gap-4">
                <div className="flex-1 h-px bg-gray-200 dark:bg-[#2a2f3a]" />
                <span className="text-xs text-gray-500 dark:text-gray-600 uppercase tracking-wider">or continue with</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-[#2a2f3a]" />
              </div>

              <button
                onClick={async () => {
                  try {
                    await signIn("google", { callbackUrl: "/dashboard/overview" });
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Google sign-in failed");
                  }
                }}
                className="w-full py-3.5 border border-gray-300 dark:border-[#2a2f3a] rounded-lg hover:bg-gray-50 dark:hover:bg-[#161B22] transition flex items-center justify-center gap-3 text-gray-900 dark:text-white font-medium"
              >
                <FcGoogle size={20} />
                <span>Google</span>
              </button>

              <p className="mt-8 text-center text-sm text-gray-600 dark:text-gray-500 lg:hidden">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition font-medium">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </>
  );
}

export default dynamic(() => Promise.resolve(LoginPage), { ssr: false });
