"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  AiOutlineArrowRight,
  AiOutlineBarChart,
  AiOutlineLock,
  AiOutlineThunderbolt,
  AiOutlineGlobal,
  AiOutlineCheck,
  AiOutlineStar,
  AiOutlineCloudUpload,
  AiOutlinePlayCircle,
  AiOutlineUser,
  AiOutlinePhone,
  AiOutlineMenu,
  AiOutlineClose,
  AiOutlineBulb,
  AiOutlineLineChart,
  AiOutlineSwap,
} from "react-icons/ai";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

/*
  TRADIA - Hyper-Optimized Landing Page (src/app/page.tsx)

  Goals for this revision:
  - 10x conversion-focused layout with clear value props and trust signals
  - Dark/Light/System theme toggle with persistence
  - Animated dashboard mockup, number counters, sticky CTA, signup modal
  - Testimonials with generated-looking avatars (SVG placeholders)
  - Strong microcopy that reflects what Tradia actually does

  Developer notes:
  - Requires Tailwind CSS + framer-motion + react-icons:
      npm install framer-motion react-icons
  - This file references Navbar and Footer components. If you want a fully standalone page, move the markup from those components into this file.
  - For real avatars/screenshots replace the inline SVGs / mockup with actual images (cloud-hosted or static assets).
*/

const FEATURES = [
  {
    icon: <AiOutlineBarChart className="w-6 h-6" />,
    title: "Performance Analytics",
    desc: "Auto-calculated win-rate, expectancy, P/L heatmaps, drawdown and fractional profits per symbol.",
  },
  {
    icon: <AiOutlineThunderbolt className="w-6 h-6" />,
    title: "AI-Powered Reviews",
    desc: "AI highlights mistakes, suggests SL/TP, and creates a checklist for each trade.",
  },
  {
    icon: <AiOutlineLock className="w-6 h-6" />,
    title: "Secure Sync",
    desc: "Encrypted MT5/CSV uploads with automatic column mapping and preview before import.",
  },
  {
    icon: <AiOutlineGlobal className="w-6 h-6" />,
    title: "Multi-Account View",
    desc: "Aggregate accounts, compare strategies and build a single equity curve across brokers.",
  },
  {
    icon: <AiOutlineBulb className="w-6 h-6" />,
    title: "Strategy Tags & Filters",
    desc: "Tag trades, track strategy P/L, timeframe performance and visualise edge over time.",
  },
  {
    icon: <AiOutlineLineChart className="w-6 h-6" />,
    title: "Prop-Firm Tools",
    desc: "Audit-ready reports, risk limits and compliance exports for prop-firm applications.",
  },
];

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    monthly: 0,
    highlights: ["Core analytics", "30-day history", "1 MT5/CSV upload"],
    cta: "Create free account",
    tag: "Free",
  },
  {
    id: "plus",
    name: "Trader Plus",
    monthly: 12,
    highlights: ["6 months history", "3 accounts", "AI weekly summary"],
    cta: "Start 7-day trial",
    tag: "Most traders",
  },
  {
    id: "pro",
    name: "Pro Trader",
    monthly: 29,
    highlights: ["Unlimited history", "5 accounts", "AI trade reviews"],
    cta: "Start 7-day trial",
    tag: "Active traders",
  },
  {
    id: "elite",
    name: "Elite",
    monthly: 79,
    highlights: ["Team seats", "Strategy builder", "Prop-firm dashboard"],
    cta: "Contact sales",
    tag: "Enterprise",
  },
];

const TESTIMONIALS = [
  {
    name: "Amina K.",
    role: "Scalper",
    text: "Tradia's AI reviews caught my recurring sizing mistakes and increased my monthly ROI by 18%.",
  },
  {
    name: "Sam R.",
    role: "Swing Trader",
    text: "The strategy tags saved me from thinking I was profitable — now I clearly see what works.",
  },
  {
    name: "Noah P.",
    role: "Risk Manager",
    text: "Audit-ready reports made prop applications painless. The timeline view is brilliant.",
  },
];

// small utility: animated number hook
function useCountTo(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    let raf: number;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(1, elapsed / duration);
      setValue(Math.round(progress * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

export default function Page() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<string>("plus");
  const [showSignup, setShowSignup] = useState(false);
  const [theme, setTheme] = useState<"system" | "dark" | "light">("system");

  // counters
  const users = useCountTo(25487, 1400);
  const trades = useCountTo(1254321, 1400);
  const avgWin = useCountTo(68, 1400);

  // persist theme
  useEffect(() => {
    const saved = localStorage.getItem("tradia:theme");
    if (saved === "dark" || saved === "light" || saved === "system") setTheme(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("tradia:theme", theme);
    const root = window.document.documentElement;
    if (theme === "system") {
      const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefers);
    } else {
      root.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);

  // toggle billing
  const toggleBilling = () => setBilling((b) => (b === "monthly" ? "yearly" : "monthly"));

  // CTA sticky show
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 420);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <Navbar />

      {/* Sticky bottom CTA */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: scrolled ? 1 : 0, y: scrolled ? 0 : 24 }}
        transition={{ type: "spring", stiffness: 120 }}
        className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50"
        aria-hidden={!scrolled}
      >
        <div className="bg-gradient-to-r from-indigo-600 to-pink-500 text-white rounded-full shadow-lg px-4 py-3 flex items-center gap-4">
          <div className="text-sm font-semibold">Try Tradia Pro free for 7 days</div>
          <button onClick={() => setShowSignup(true)} className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-full px-3 py-2 text-sm font-semibold">
            Start trial <AiOutlineArrowRight />
          </button>
        </div>
      </motion.div>

      <main className="min-h-screen bg-white text-gray-900 dark:bg-[#071425] dark:text-gray-100 transition-colors duration-300">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 pointer-events-none">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1200 600" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="g1" x1="0%" x2="100%">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#EC4899" stopOpacity="0.06" />
                </linearGradient>
              </defs>
              <rect width="1200" height="600" fill="url(#g1)" />
            </svg>
          </div>

          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 lg:py-28">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7">
                <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
                  Tradia — <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-pink-500">AI-first</span> trading performance
                </motion.h1>

                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }} className="mt-6 text-lg text-gray-600 dark:text-gray-300 max-w-2xl">
                  Connect MT5 or upload CSV, and Tradia automatically maps, analyzes and reviews every trade — giving you a personalized plan to cut losses and scale edge.
                </motion.p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <motion.button whileTap={{ scale: 0.98 }} onClick={() => setShowSignup(true)} className="inline-flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full shadow-lg font-semibold">
                    Start free trial <AiOutlineArrowRight />
                  </motion.button>

                  <Link href="/pricing" className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-indigo-600 text-indigo-600 hover:bg-indigo-50">
                    View plans
                  </Link>

                  <button onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} className="ml-2 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800">
                    {theme === "dark" ? "Light" : "Dark"} mode
                  </button>
                </div>

                {/* trust metrics */}
                <div className="mt-8 flex flex-wrap gap-4 items-center text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-3">
                    <div className="font-semibold text-xl text-indigo-600">{users.toLocaleString()}</div>
                    <div>traders onboard</div>
                  </div>

                  <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

                  <div className="flex items-center gap-3">
                    <div className="font-semibold text-xl text-indigo-600">{trades.toLocaleString()}</div>
                    <div>trades analyzed</div>
                  </div>

                  <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

                  <div className="flex items-center gap-3">
                    <div className="font-semibold text-xl text-indigo-600">{avgWin}%</div>
                    <div>avg win rate</div>
                  </div>
                </div>
              </div>

              {/* interactive dashboard mockup */}
              <div className="lg:col-span-5">
                <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.12 }} className="rounded-3xl bg-gradient-to-b from-white to-gray-50 dark:from-[#052033] dark:to-transparent shadow-2xl border border-gray-100 dark:border-gray-800 p-6">
                  <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-700 to-indigo-400 text-white p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs opacity-80">Account</div>
                        <div className="text-lg font-semibold">LIVE • TRD-USD</div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs opacity-80">Equity</div>
                        <div className="text-2xl font-bold">$24,682.91</div>
                      </div>
                    </div>

                    {/* small animated chart */}
                    <svg className="w-full h-36 mt-4" viewBox="0 0 200 80" preserveAspectRatio="none">
                      <polyline fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" points="0,60 20,50 40,40 60,30 80,36 100,20 120,24 140,18 160,28 180,12 200,8" strokeLinecap="round" strokeLinejoin="round" />
                      <linearGradient id="g2" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#fff" stopOpacity="0.12" />
                        <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                      </linearGradient>
                    </svg>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="bg-white/10 p-3 rounded-md">
                        <div className="text-xs opacity-80">Win Rate</div>
                        <div className="text-lg font-semibold">72%</div>
                      </div>
                      <div className="bg-white/10 p-3 rounded-md">
                        <div className="text-xs opacity-80">Avg P/L</div>
                        <div className="text-lg font-semibold">+$58.12</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3 text-sm text-gray-700 dark:text-gray-200">
                    <div className="p-3 rounded-lg bg-white">Pairs</div>
                    <div className="p-3 rounded-lg bg-white">Edge</div>
                    <div className="p-3 rounded-lg bg-white">Timeline</div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold">Tools to find your edge — not guesswork</h2>
              <p className="mt-2 text-gray-600 dark:text-gray-300">Everything Tradia does — exactly, honestly.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((f, i) => (
                <motion.div key={i} whileHover={{ y: -6 }} className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600">{f.icon}</div>
                    <div>
                      <h3 className="font-semibold text-lg">{f.title}</h3>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{f.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Link href="/signup" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-indigo-600 text-white font-semibold shadow">Get started free</Link>
            </div>
          </div>
        </section>

        {/* Social proof / numbers + badges */}
        <section className="py-12 px-6 lg:px-8 bg-gradient-to-b from-gray-50 dark:from-[#021017]">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex gap-6 items-center">
              <div className="p-4 bg-white rounded-xl shadow">
                <div className="text-sm text-gray-500">Traders</div>
                <div className="text-2xl font-bold text-indigo-600">{users.toLocaleString()}</div>
              </div>

              <div className="p-4 bg-white rounded-xl shadow">
                <div className="text-sm text-gray-500">Trades analyzed</div>
                <div className="text-2xl font-bold text-indigo-600">{trades.toLocaleString()}</div>
              </div>

              <div className="p-4 bg-white rounded-xl shadow">
                <div className="text-sm text-gray-500">Avg win rate</div>
                <div className="text-2xl font-bold text-indigo-600">{avgWin}%</div>
              </div>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-300">Trusted by retail traders & prop teams — audit-ready exports and compliance reports included.</div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-16 px-6 lg:px-8">
          <div className="max-w-6xl mx-auto text-center">
            <div className="mb-4">
              <h2 className="text-3xl font-bold">Pricing that grows with you</h2>
              <p className="text-gray-600 dark:text-gray-300 mt-2">Monthly or yearly billing. Try Pro for 7 days — no card required for Starter.</p>
            </div>

            <div className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-sm">
              <button onClick={toggleBilling} className="px-4 py-2 font-semibold">Toggle billing</button>
              <div className="px-3 py-2 text-xs text-gray-500">{billing === "monthly" ? "Monthly" : "Yearly (save 20%)"}</div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {PLANS.map((p) => {
                const price = billing === "monthly" ? p.monthly : Math.round(p.monthly * 12 * 0.8);
                const active = selectedPlan === p.id;
                return (
                  <motion.div key={p.id} whileHover={{ y: -8 }} className={`p-6 rounded-2xl border ${active ? "border-indigo-600 shadow-2xl" : "border-gray-200 dark:border-gray-700"} bg-white dark:bg-gray-800`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold">{p.name}</h3>
                        <div className="text-sm text-gray-500 mt-1">{p.tag}</div>
                      </div>
                      <div className="text-2xl font-extrabold">
                        {price === 0 ? "Free" : `$${price}`}
                        <div className="text-xs font-medium text-gray-500">{price === 0 ? "" : billing === "monthly" ? "/mo" : "/yr"}</div>
                      </div>
                    </div>

                    <ul className="mb-6 text-gray-600 dark:text-gray-300 space-y-2">
                      {p.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <AiOutlineCheck className="mt-1 text-indigo-600" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="flex flex-col gap-3">
                      <button onClick={() => { setSelectedPlan(p.id); setShowSignup(true); }} className={`w-full py-3 rounded-lg font-semibold ${active ? "bg-indigo-600 text-white" : "bg-white border border-indigo-600 text-indigo-600"}`}>
                        {p.cta}
                      </button>

                      <Link href="/pricing" className="text-sm text-gray-500 hover:underline text-center">Compare plans</Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-6 text-sm text-gray-500">Need a team plan or prop-firm support? <Link href="/contact" className="text-indigo-600 hover:underline">Contact sales</Link>.</div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-12 px-6 lg:px-8 bg-gradient-to-b from-gray-50 dark:from-[#081a20]">
          <div className="max-w-6xl mx-auto text-center">
            <h3 className="text-2xl font-bold mb-3">What traders say</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">Hand-picked reviews from verified users.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {TESTIMONIALS.map((t, i) => (
                <motion.blockquote key={i} whileHover={{ scale: 1.02 }} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 text-left">
                  {/* avatar: generated-looking SVG */}
                  <div className="flex items-center gap-4 mb-3">
                    <svg className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 p-2" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="14" fill="white">{t.name.split(" ")[0][0]}</text>
                    </svg>

                    <div>
                      <div className="font-semibold">{t.name}</div>
                      <div className="text-sm text-gray-500">{t.role}</div>
                    </div>
                  </div>

                  <p className="text-gray-600 dark:text-gray-300">"{t.text}"</p>
                </motion.blockquote>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ & final CTA */}
        <section className="py-16 px-6 lg:px-8">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">Frequently asked questions</h3>
              <details className="bg-white dark:bg-gray-800 p-4 rounded-2xl mb-3 border border-gray-200 dark:border-gray-700">
                <summary className="font-medium">Is there a free plan?</summary>
                <p className="mt-2 text-gray-600 dark:text-gray-300">Yes — Starter is free forever and includes core analytics and a 30-day history.</p>
              </details>

              <details className="bg-white dark:bg-gray-800 p-4 rounded-2xl mb-3 border border-gray-200 dark:border-gray-700">
                <summary className="font-medium">Which brokers are supported?</summary>
                <p className="mt-2 text-gray-600 dark:text-gray-300">We support MT5, CSV uploads and are adding direct broker integrations. All imports are previewed before committing.</p>
              </details>

              <details className="bg-white dark:bg-gray-800 p-4 rounded-2xl mb-3 border border-gray-200 dark:border-gray-700">
                <summary className="font-medium">How does the AI help?</summary>
                <p className="mt-2 text-gray-600 dark:text-gray-300">AI analyzes each trade's context (entry, exit, timeframe, SL/TP) and returns concise actions: sizing changes, likely mistakes, and strategy-level recommendations.</p>
              </details>
            </div>

            <div className="bg-gradient-to-br from-indigo-600 to-pink-500 text-white p-8 rounded-2xl shadow-xl">
              <h4 className="text-xl font-bold">Ready to stop guessing?</h4>
              <p className="mt-2 text-sm opacity-90">Start for free — upgrade when you're ready. 7-day Pro trials for Plus & Pro.</p>
              <div className="mt-6 flex gap-3">
                <button onClick={() => setShowSignup(true)} className="bg-white text-indigo-600 px-4 py-2 rounded-full font-semibold">Start free</button>
                <Link href="/pricing" className="bg-white/20 border border-white/30 px-4 py-2 rounded-full">See plans</Link>
              </div>

              <div className="mt-6 text-xs opacity-90">Need help? <Link href="/contact" className="underline">Contact us</Link>.</div>
            </div>
          </div>
        </section>

        <Footer />
      </main>

      {/* Signup modal */}
      <AnimatePresence>
        {showSignup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center">
            <div onClick={() => setShowSignup(false)} className="absolute inset-0 bg-black/40" />
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} transition={{ type: "spring" }} className="relative z-50 w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-bold">Create your free Tradia account</h4>
                <button onClick={() => setShowSignup(false)} className="p-2 rounded-full bg-gray-100 dark:bg-gray-800">
                  <AiOutlineClose />
                </button>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">No credit card required for Starter. Secure signups and instant onboarding.</p>

              <form className="mt-4 grid grid-cols-1 gap-3">
                <input className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" placeholder="Full name" />
                <input className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" placeholder="Email address" />

                <div className="flex gap-2">
                  <button type="button" onClick={() => { setShowSignup(false); alert('Demo signup simulated — integrate your auth flow here.'); }} className="flex-1 bg-indigo-600 text-white px-4 py-3 rounded-lg font-semibold">Create account</button>
                  <button type="button" onClick={() => { setShowSignup(false); }} className="flex-1 border border-gray-300 rounded-lg px-4 py-3">Cancel</button>
                </div>

                <div className="text-xs text-gray-500">By creating an account you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.</div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
