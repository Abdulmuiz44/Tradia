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
} from "react-icons/ai";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

/*
  Highly redesigned landing page for Tradia.
  - Built for conversion with clear CTAs, pricing toggle, feature highlights
  - Framer Motion animations and micro-interactions
  - Accessible and mobile-first responsive design
  - Drop-in replacement for src/app/page.tsx (Next.js app router)

  Notes for developer:
  - Ensure Tailwind CSS is configured in the project (JIT) and you have framer-motion + react-icons installed:
    npm install framer-motion react-icons
  - This file references Navbar and Footer components; if you want truly standalone, move those UI bits here.
*/

const features = [
  {
    icon: <AiOutlineBarChart className="w-7 h-7" />,
    title: "Smart Performance Tracking",
    description: "Real-time metrics, charts and behavioral insights to level-up your trading.",
  },
  {
    icon: <AiOutlineLock className="w-7 h-7" />,
    title: "Secure & Private",
    description: "End-to-end encryption — your data stays yours.",
  },
  {
    icon: <AiOutlineThunderbolt className="w-7 h-7" />,
    title: "Lightning Feedback",
    description: "AI-powered trade reviews & micro-hints in seconds.",
  },
  {
    icon: <AiOutlineGlobal className="w-7 h-7" />,
    title: "Trade Anywhere",
    description: "Responsive dashboards built for desktop and mobile.",
  },
];

const benefits = [
  { title: "Win Rate & P/L", desc: "See profitability across symbols, timeframes and strategies." },
  { title: "Risk Metrics", desc: "Real drawdown tracking, position-sizing suggestions and alerts." },
  { title: "Trade Timeline", desc: "Visualize streaks, equity curves and heatmaps." },
  { title: "AI Hints", desc: "Automated notes on recurring mistakes and edge opportunities." },
  { title: "Strategy Tags", desc: "Tag and compare strategies — track what truly works." },
  { title: "Multi-Account View", desc: "Aggregate accounts into one portfolio-level view." },
];

const plans = [
  {
    id: "starter",
    name: "Starter",
    monthly: 0,
    highlights: ["Core analytics", "30 days history", "1 account connection"],
    cta: "Get started",
    tag: "Free",
  },
  {
    id: "plus",
    name: "Trader Plus",
    monthly: 9,
    highlights: ["6 months history", "3 account connections", "AI weekly summary"],
    cta: "Start trial",
    tag: "Popular",
  },
  {
    id: "pro",
    name: "Pro Trader",
    monthly: 19,
    highlights: ["Unlimited history", "5 account connections", "AI trade reviews"],
    cta: "Start trial",
    tag: "Best for active traders",
  },
  {
    id: "elite",
    name: "Elite",
    monthly: 39,
    highlights: ["Strategy builder", "Unlimited connections", "Prop-firm dashboard"],
    cta: "Contact sales",
    tag: "Advanced",
  },
];

const testimonials = [
  {
    name: "Amina - Scalper",
    text: "Tradia helped me cut losing streaks earlier. The AI hints are shockingly accurate.",
    rating: 5,
  },
  {
    name: "Sam - Swing Trader",
    text: "Portfolio view let me finally see which strategies worked and which were noise.",
    rating: 5,
  },
  {
    name: "Noah - Prop Firm",
    text: "Prop firm metrics and risk tools saved us time during audits.",
    rating: 5,
  },
];

const stagger = {
  hidden: { opacity: 0, y: 8 },
  show: (i = 1) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      ease: "easeOut",
    },
  }),
};

export default function Home() {
  const [selectedPlan, setSelectedPlan] = useState("plus");
  const [billing, setBilling] = useState("monthly");
  const [activeFAQ, setActiveFAQ] = useState<number | null>(null);
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  // testimonial autoplay
  useEffect(() => {
    const id = setInterval(() => setTestimonialIdx((p) => (p + 1) % testimonials.length), 6000);
    return () => clearInterval(id);
  }, []);

  // small accessibility focus when changing plan
  useEffect(() => {
    const el = document.getElementById("pricing-heading");
    el?.focus();
  }, [billing]);

  return (
    <>
      <Navbar />

      <main className="bg-white dark:bg-[#0b1020] text-gray-900 dark:text-gray-100 min-h-screen">
        {/* Animated hero */}
        <section className="relative overflow-hidden">
          {/* gradient orbs */}
          <div className="absolute inset-0 pointer-events-none -z-10">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              className="absolute -left-48 -top-48 w-[520px] h-[520px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-10 rounded-full blur-3xl"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
              className="absolute -right-40 -bottom-40 w-[420px] h-[420px] bg-gradient-to-r from-emerald-300 to-indigo-400 opacity-8 rounded-full blur-3xl"
            />
          </div>

          <div className="max-w-7xl mx-auto px-6 py-24 lg:py-32">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7">
                <motion.h1
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05, duration: 0.6 }}
                  className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight"
                >
                  Your <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-pink-500">AI Trading Assistant</span>
                  <br />
                  Track performance. Find edge. Trade smarter.
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-300"
                >
                  Tradia gives retail traders transparent analytics, AI-driven trade reviews and portfolio-level performance tools — built for real traders who want real results.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="mt-8 flex flex-col sm:flex-row gap-3"
                >
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 hover:bg-indigo-700 px-6 py-3 text-lg font-semibold text-white shadow-lg"
                    aria-label="Get started for free"
                  >
                    Get started for free <AiOutlineArrowRight />
                  </Link>

                  <Link
                    href="/pricing"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-indigo-600 px-6 py-3 text-lg font-semibold text-indigo-600 hover:bg-indigo-50"
                    aria-label="See pricing"
                  >
                    View pricing
                  </Link>
                </motion.div>

                <motion.div className="mt-6 flex items-center gap-6 text-sm text-gray-500">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-full">
                      <AiOutlineCloudUpload className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <div className="font-semibold">CSV / MT5 upload</div>
                      <div className="text-xs">Auto-mapping, previews and secure processing</div>
                    </div>
                  </div>

                  <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

                  <div className="hidden sm:flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-full">
                      <AiOutlinePlayCircle className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <div className="font-semibold">7-day trials</div>
                      <div className="text-xs">Try Pro features before you pay</div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Hero illustration / mockup */}
              <div className="lg:col-span-5 relative">
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25, duration: 0.6 }}
                  className="bg-gradient-to-b from-white to-gray-50 dark:from-[#071025] dark:to-transparent border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-2xl"
                >
                  <div className="w-full h-full min-h-[280px] md:min-h-[360px] lg:min-h-[420px] overflow-hidden rounded-2xl">
                    {/* lightweight mockup — replace later with real screenshot or canvas */}
                    <div className="w-full h-full bg-gradient-to-br from-indigo-700 via-indigo-500 to-indigo-300 p-6 rounded-2xl text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs uppercase opacity-80">Account</div>
                          <div className="text-lg font-semibold">TRD-USD • Live</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm opacity-80">Equity</div>
                          <div className="text-2xl font-bold">$12,486.23</div>
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-4">
                        <div className="bg-white/10 p-3 rounded-lg">
                          <div className="text-xs opacity-80">Win Rate</div>
                          <div className="text-lg font-semibold">68%</div>
                        </div>
                        <div className="bg-white/10 p-3 rounded-lg">
                          <div className="text-xs opacity-80">Avg P/L</div>
                          <div className="text-lg font-semibold">+$42.31</div>
                        </div>
                      </div>

                      <div className="mt-6 h-32 bg-white/10 rounded-lg flex items-end p-4">
                        <div className="w-full h-24 bg-white/20 rounded-lg" />
                      </div>
                    </div>
                  </div>
                </motion.div>

                <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <AiOutlineUser className="w-4 h-4" />
                    <div>Trusted by traders worldwide</div>
                  </div>

                  <div className="flex items-center gap-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <AiOutlineStar key={i} className="w-4 h-4 text-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features grid */}
        <section className="py-16 px-6 sm:px-12 lg:px-20">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold">
                Everything traders need to analyze, improve and scale
              </motion.h2>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }} className="text-gray-600 dark:text-gray-300 mt-3">
                Built around the workflows real traders use: quick uploads, fast insights, and real-time performance tracking.
              </motion.p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600">{f.icon}</div>
                    <div>
                      <h3 className="font-semibold text-lg">{f.title}</h3>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{f.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Link href="/signup" className="inline-flex items-center gap-2 rounded-full px-6 py-3 bg-indigo-600 text-white font-semibold shadow">
                Try Tradia free <AiOutlineArrowRight />
              </Link>
            </div>
          </div>
        </section>

        {/* Benefits / Value */}
        <section className="py-16 px-6 bg-gray-50 dark:bg-[#041026]">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center px-6">
            <div>
              <motion.h3 initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold">
                Become a better trader — faster
              </motion.h3>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }} className="text-gray-600 dark:text-gray-300 mt-4">
                Tradia surfaces patterns in your trading, highlights edge, and shows where you leak performance. Stop guessing — start improving.
              </motion.p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {benefits.slice(0, 4).map((b, i) => (
                  <motion.div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="font-semibold">{b.title}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{b.desc}</div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div>
              <div className="bg-gradient-to-br from-indigo-600 to-pink-500 text-white p-6 rounded-2xl shadow-xl">
                <div className="text-sm opacity-80">Sample Insight</div>
                <div className="text-xl font-bold mt-2">You lose most on Friday evenings — reduce lot size by 20%.</div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="bg-white/10 p-3 rounded-md">
                    <div className="text-xs opacity-80">Avg loss</div>
                    <div className="font-semibold">-$342.14</div>
                  </div>
                  <div className="bg-white/10 p-3 rounded-md">
                    <div className="text-xs opacity-80">Missed entries</div>
                    <div className="font-semibold">12</div>
                  </div>
                </div>

                <div className="mt-6">
                  <Link href="/insights" className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 font-semibold">
                    See more insights <AiOutlineArrowRight />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-16 px-6 sm:px-12 lg:px-20">
          <div className="max-w-6xl mx-auto text-center">
            <div className="mb-6">
              <h2 id="pricing-heading" tabIndex={-1} className="text-3xl font-bold">Pricing that scales with your trading</h2>
              <p className="text-gray-600 dark:text-gray-300 mt-2">Start free — upgrade anytime. Monthly and yearly billing available.</p>
            </div>

            <div className="inline-flex rounded-full bg-gray-100 dark:bg-gray-800 p-1 overflow-hidden shadow-sm">
              <button
                onClick={() => setBilling("monthly")}
                className={`px-4 py-2 rounded-full font-semibold ${billing === "monthly" ? "bg-white dark:bg-indigo-700 shadow text-indigo-600 dark:text-white" : "text-gray-600 dark:text-gray-300"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling("yearly")}
                className={`px-4 py-2 rounded-full font-semibold ${billing === "yearly" ? "bg-white dark:bg-indigo-700 shadow text-indigo-600 dark:text-white" : "text-gray-600 dark:text-gray-300"}`}
              >
                Yearly (save 20%)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
              {plans.map((p) => {
                const price = billing === "monthly" ? p.monthly : Math.round(p.monthly * 12 * 0.8);
                const highlighted = selectedPlan === p.id;
                return (
                  <motion.div
                    key={p.id}
                    whileHover={{ y: -6 }}
                    className={`p-6 rounded-2xl border ${highlighted ? "border-indigo-600 shadow-2xl" : "border-gray-200 dark:border-gray-700"} bg-white dark:bg-gray-800`}
                  >
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

                    <ul className="text-gray-600 dark:text-gray-300 mb-6 space-y-2">
                      {p.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <AiOutlineCheck className="mt-1 text-indigo-600" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => setSelectedPlan(p.id)}
                        className={`w-full py-3 rounded-lg font-semibold ${highlighted ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-white border border-indigo-600 text-indigo-600 hover:bg-indigo-50"}`}
                      >
                        {p.cta}
                      </button>

                      {p.id !== "starter" && (
                        <Link href="/pricing" className="text-center text-sm text-gray-600 dark:text-gray-300 hover:underline">Compare plans</Link>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-6 text-sm text-gray-500">Need a custom plan or prop-firm support? <Link href="/contact" className="text-indigo-600 hover:underline">Contact us</Link>.</div>
          </div>
        </section>

        {/* Testimonials carousel */}
        <section className="py-16 px-6 sm:px-12">
          <div className="max-w-5xl mx-auto text-center">
            <h3 className="text-2xl font-bold mb-4">Loved by traders worldwide</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">Real traders using Tradia to improve strategy and consistency.</p>

            <div className="relative">
              <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={testimonialIdx}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700" />
                        <div className="text-left">
                          <div className="font-semibold">{testimonials[testimonialIdx].name}</div>
                          <div className="text-sm text-gray-500">{testimonials[testimonialIdx].rating} stars</div>
                        </div>
                      </div>

                      <p className="text-gray-600 dark:text-gray-300 text-center">“{testimonials[testimonialIdx].text}”</p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-center gap-3 mt-4">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setTestimonialIdx(i)}
                    aria-label={`Show testimonial ${i + 1}`}
                    className={`w-2 h-2 rounded-full ${i === testimonialIdx ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ + CTA */}
        <section className="py-16 px-6 sm:px-12 lg:px-20 bg-gradient-to-b from-white to-gray-50 dark:from-[#041024] dark:to-[#02101c]">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
            <div>
              <h2 className="text-3xl font-bold mb-4">Frequently asked questions</h2>

              <div className="space-y-3">
                {[
                  {
                    q: "Is there a free plan?",
                    a: "Yes — the Starter plan is free forever and includes core analytics and a 30-day history.",
                  },
                  { q: "Which brokers are supported?", a: "We support MT5 and popular brokers with CSV uploads — more integrations coming." },
                  { q: "Can I upgrade later?", a: "Absolutely — upgrading keeps all your data and unlocks more history and AI features." },
                  { q: "How do trials work?", a: "Plus & Pro include a 7-day trial so you can test premium features before billing." },
                ].map((f, i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                    <button
                      onClick={() => setActiveFAQ(activeFAQ === i ? null : i)}
                      className="w-full text-left flex items-center justify-between gap-3"
                    >
                      <span className="font-medium">{f.q}</span>
                      <span className="text-gray-500">{activeFAQ === i ? "−" : "+"}</span>
                    </button>
                    {activeFAQ === i && <p className="mt-3 text-gray-600 dark:text-gray-300">{f.a}</p>}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold mb-3">Ready to improve your trading?</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">Start for free and upgrade when you're ready — no hard paywall.</p>
              <Link href="/signup" className="w-full inline-block text-center bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold">Get started (Free)</Link>
              <div className="mt-4 text-sm text-gray-500">Or explore pricing to find the right plan.</div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Link href="/contact" className="inline-flex items-center gap-2 justify-center rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2">Contact sales</Link>
                <Link href="/docs" className="inline-flex items-center gap-2 justify-center rounded-md px-3 py-2 bg-gray-100 dark:bg-gray-700">View docs</Link>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </>
  );
}
