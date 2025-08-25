
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AiOutlineArrowRight,
  AiOutlineBarChart,
  AiOutlineLock,
  AiOutlineThunderbolt,
  AiOutlineGlobal,
  AiOutlineCheck,
} from "react-icons/ai";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

/**
 * src/app/page.tsx
 * - Clean, compile-ready TSX
 * - Visible stats removed per request
 * - All /pricing routes changed to /payment
 * - Keeps design and layout unchanged otherwise
 */

/* === Content kept from your copy === */
const FEATURES_ORIG = [
  {
    icon: <AiOutlineBarChart className="w-7 h-7" />,
    title: "Smart Performance Tracking",
    description: "Real-time metrics, charts and behavioral insights to level-up your trading.",
  },
  {
    icon: <AiOutlineLock className="w-7 h-7" />,
    title: "Secure & Private",
    description: "Your trading data is encrypted and accessible only to you.",
  },
  {
    icon: <AiOutlineThunderbolt className="w-7 h-7" />,
    title: "Lightning-Fast Feedback",
    description: "AI-powered trade reviews & suggestions in seconds.",
  },
  {
    icon: <AiOutlineGlobal className="w-7 h-7" />,
    title: "Trade Anywhere",
    description: "Responsive web app and mobile-friendly dashboards for traders on the move.",
  },
];

const BENEFITS = [
  { title: "Win Rate & P/L", desc: "Understand your profitability at a glance." },
  { title: "Risk Metrics", desc: "Drawdown, lot-size averages and quick risk checks." },
  { title: "Trade Timeline", desc: "Visualize your performance over time." },
  { title: "AI Hints", desc: "Automated notes on recurring mistakes (Pro)." },
  { title: "Strategy Tags", desc: "Label trades and filter performance per strategy." },
  { title: "Multi-Account View", desc: "Aggregate accounts into a single portfolio view." },
];

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    monthly: 0,
    highlights: ["Basic trade analytics", "30 days trade history", "1 account connection (MT5)"],
    cta: "Get started (Free)",
    tag: "Free forever",
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 9,
    highlights: ["All Starter features", "6 months trade history", "3 account connections", "AI weekly summary"],
    cta: "Start 7-day trial",
    tag: "Popular",
  },
  {
    id: "plus",
    name: "Plus",
    monthly: 19,
    highlights: ["All Pro features", "Unlimited history", "5 account connections", "AI trade reviews & SL/TP suggestions"],
    cta: "Start 7-day trial",
    tag: "For active traders",
  },
  {
    id: "elite",
    name: "Elite",
    monthly: 39,
    highlights: ["Everything in Plus", "Unlimited connections", "AI strategy builder", "Prop-firm dashboard"],
    cta: "Contact sales",
    tag: "Advanced",
  },
];

const TESTIMONIALS = [
  { name: "Amina K.", role: "Scalper", text: "Tradia pinpointed my sizing leaks and improved my RR immediately.", initials: "A" },
  { name: "Sam R.", role: "Swing Trader", text: "Tagging strategies changed everything — now I trade the winners.", initials: "S" },
  { name: "Noah P.", role: "Risk Manager", text: "Audit-ready exports and clear risk charts saved our team hours.", initials: "N" },
];

/* small animated counter hook (kept but not displayed) */
function useCountTo(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    let raf = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(1, elapsed / duration);
      setValue(Math.floor(progress * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

export default function Home(): React.ReactElement {
  const router = useRouter();
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<string>("pro");
  const [testimonialIdx, setTestimonialIdx] = useState<number>(0);

  // counters intentionally kept but not shown (to satisfy earlier design)
  const users = useCountTo(31245, 1400);
  const trades = useCountTo(2435120, 1400);
  const avgWin = useCountTo(67, 1400);
  // avoid unused variable complaints
  void users;
  void trades;
  void avgWin;

  useEffect(() => {
    const id = setInterval(() => setTestimonialIdx((i) => (i + 1) % TESTIMONIALS.length), 6500);
    return () => clearInterval(id);
  }, []);

  const navSignup = () => router.push("/signup");

  const priceFor = (planId: string) => {
    const p = PLANS.find((x) => x.id === planId)!;
    return billing === "monthly" ? p.monthly : Math.round(p.monthly * 12 * 0.8);
  };

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#061226] text-gray-100">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 pointer-events-none">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1400 600" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="g1" x1="0%" x2="100%">
                  <stop offset="0%" stopColor="#0ea5a4" stopOpacity="0.07" />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.05" />
                </linearGradient>
              </defs>
              <rect width="1400" height="600" fill="url(#g1)" />
            </svg>
          </div>

          <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7">
                <motion.h1
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight"
                >
                  Tradia — <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-pink-400">AI Trading Performance Assistant</span>
                </motion.h1>

                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }} className="mt-6 text-lg text-gray-300 max-w-2xl">
                  Track performance, discover edge, and scale with confidence. Connect MT5 or upload CSV — get instant AI trade reviews, risk checks, and portfolio-level insights built for real traders.
                </motion.p>

                <div className="mt-8 flex flex-wrap gap-3 items-center">
                  <motion.button onClick={navSignup} whileTap={{ scale: 0.98 }} className="inline-flex items-center gap-3 bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-full shadow-lg font-semibold">
                    Create free account <AiOutlineArrowRight />
                  </motion.button>

                  <Link href="/components/payment" className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-indigo-500 text-indigo-300 hover:bg-indigo-900/20">
                    View plans
                  </Link>

                  {/* stats intentionally removed — nothing visible here */}
                </div>

                {/* trust metrics removed per request */}
              </div>

              {/* Dashboard mockup */}
              <div className="lg:col-span-5">
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.12 }}
                  className="rounded-2xl border border-white/10 shadow-2xl overflow-hidden bg-gradient-to-br from-black/20 to-white/5 backdrop-blur-sm"
                >
                  <img src="/TradiaDashboard.png" alt="Tradia dashboard screenshot" className="w-full h-auto object-cover" />
                </motion.div>

                <div className="mt-3 text-xs text-gray-400">Live dashboard preview (Upload trade history to see interactive charts).</div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="py-12 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold">Key features</h2>
              <p className="mt-2 text-gray-400 max-w-2xl mx-auto">Everything traders need to analyze, improve and scale — built around real workflows.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {FEATURES_ORIG.map((f, i) => (
                <motion.div key={i} whileHover={{ y: -6 }} className="p-6 rounded-xl border border-white/10 bg-transparent shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-indigo-700/10 text-indigo-300">{f.icon}</div>
                    <div>
                      <h3 className="font-semibold text-lg">{f.title}</h3>
                      <p className="mt-2 text-sm text-gray-400">{f.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <button onClick={navSignup} className="inline-flex items-center gap-2 rounded-full px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold shadow">
                Try Tradia free <AiOutlineArrowRight />
              </button>
            </div>
          </div>
        </section>

        {/* BENEFITS + INSIGHT */}
        <section className="py-14 px-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div>
              <h3 className="text-2xl font-bold">Benefits</h3>
              <p className="mt-3 text-gray-400">Powerful analytics wrapped in a friendly UI — built for traders who trade.</p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {BENEFITS.slice(0, 4).map((b, i) => (
                  <div key={i} className="p-4 rounded-xl border border-white/10">
                    <div className="font-semibold text-gray-100">{b.title}</div>
                    <div className="text-sm text-gray-400 mt-1">{b.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <img src="/TradiaInsights.png" alt="Tradia insights preview" className="w-full h-auto object-cover" />
              </div>
              <div className="mt-3 text-sm text-gray-400">Insights preview — automated, actionable, and tailored to your account history.</div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-16 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-3xl font-bold">Pricing</h2>
            <p className="mt-2 text-gray-400">Start free — upgrade when you need advanced AI and history.</p>

            <div className="mt-6 inline-flex rounded-full bg-white/5 p-1 shadow-sm">
              <button
                onClick={() => setBilling("monthly")}
                className={`px-4 py-2 rounded-full font-semibold ${billing === "monthly" ? "bg-indigo-500 text-white" : "text-gray-300"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling("yearly")}
                className={`px-4 py-2 rounded-full font-semibold ${billing === "yearly" ? "bg-indigo-500 text-white" : "text-gray-300"}`}
              >
                Yearly (save 20%)
              </button>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {PLANS.map((p) => {
                const price = billing === "monthly" ? p.monthly : Math.round(p.monthly * 12 * 0.8);
                const selected = selectedPlan === p.id;
                return (
                  <motion.div
                    key={p.id}
                    whileHover={{ y: -6 }}
                    className={`p-6 rounded-xl border ${selected ? "border-indigo-500 shadow-2xl" : "border-white/10"} bg-transparent`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold">{p.name}</h3>
                        <div className="text-sm text-gray-400 mt-1">{p.tag}</div>
                      </div>

                      <div className="text-2xl font-extrabold">
                        {price === 0 ? "Free" : `$${price}`}
                        <div className="text-xs font-medium text-gray-400">{price === 0 ? "" : billing === "monthly" ? "/mo" : "/yr"}</div>
                      </div>
                    </div>

                    <ul className="mb-6 text-gray-400 space-y-2 text-left">
                      {p.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <AiOutlineCheck className="mt-1 text-indigo-400" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => {
                          setSelectedPlan(p.id);
                          navSignup();
                        }}
                        className={`w-full py-3 rounded-lg font-semibold ${selected ? "bg-indigo-500 text-white" : "bg-indigo-600 text-white"}`}
                      >
                        {p.cta}
                      </button>

                      <Link href="/components/payment" className="text-center text-sm text-gray-400 hover:underline">
                        Compare plans
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-6 text-sm text-gray-400">
              Need a custom plan or prop-firm support? <Link href="/signup" className="text-indigo-300 hover:underline">Contact us</Link>.
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <h3 className="text-2xl font-bold mb-3">Loved by traders worldwide</h3>
            <p className="text-gray-400 mb-8">Traders use Tradia to find edge, reduce mistakes and scale.</p>

            <div className="grid gap-6 md:grid-cols-3">
              {TESTIMONIALS.map((t, i) => (
                <motion.div key={i} whileHover={{ y: -6 }} className="p-6 rounded-xl border border-white/10 bg-gradient-to-br from-black/20 to-white/5">
                  <div className="flex items-center gap-4 mb-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg,#7c3aed,#06b6d4)" }}
                    >
                      <span className="text-white font-bold">{t.initials}</span>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-100">{t.name}</div>
                      <div className="text-sm text-gray-400">{t.role}</div>
                    </div>
                  </div>

                  <p className="text-gray-300">"{t.text}"</p>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 text-sm text-gray-400">All testimonials anonymized to respect user privacy.</div>
          </div>
        </section>

        {/* Product previews */}
        <section className="py-12 px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            <div className="col-span-2 rounded-xl border border-white/10 overflow-hidden">
              <img src="/TradiaCalendar.png" alt="Tradia journal calendar" className="w-full h-auto object-cover" />
            </div>

            <div className="rounded-xl border border-white/10 p-6 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-lg">Pattern & setup preview</h4>
                <p className="mt-2 text-gray-400">Identify repeating patterns and trading with quick filters and tagging.</p>
              </div>

              <div className="mt-4 rounded-md overflow-hidden border border-white/10">
                <img src="/TradiaPattern.png" alt="Pattern preview" className="w-full h-auto object-cover" />
              </div>

              <div className="mt-4">
                <button onClick={navSignup} className="w-full bg-indigo-500 text-white px-4 py-2 rounded font-semibold">Get started — see your patterns</button>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ + CTA */}
        <section className="py-16 px-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">Frequently asked questions</h3>

              <div className="space-y-3">
                {[
                  { q: "Is there a free plan?", a: "Yes — Starter is free forever and includes core analytics and a 30-day history." },
                  { q: "Which brokers are supported?", a: "We support CSV imports today and are adding MT5 and more broker integrations soon." },
                  { q: "How does AI help?", a: "AI reviews entry/exit context to give actionable suggestions like sizing changes, stop recommendations and repeatable lessons." },
                ].map((fq, i) => (
                  <details key={i} className="p-4 rounded-xl border border-white/10">
                    <summary className="font-medium text-gray-100">{fq.q}</summary>
                    <p className="mt-2 text-gray-400">{fq.a}</p>
                  </details>
                ))}
              </div>
            </div>

            <div className="rounded-xl p-8 border border-white/10 bg-gradient-to-br from-indigo-600/10 to-pink-500/6">
              <h4 className="text-xl font-bold">Ready to stop guessing and start improving?</h4>
              <p className="mt-2 text-gray-300">Create an account and upload your first trade history — get instant insights and AI trade reviews.</p>
              <div className="mt-6 flex gap-3">
                <button onClick={navSignup} className="bg-indigo-500 text-white px-4 py-2 rounded-full font-semibold">Create free account</button>
                <Link href="/components/payment" className="px-4 py-2 rounded-full border border-indigo-500 text-indigo-300">See plans</Link>
              </div>

              <div className="mt-6 text-xs text-gray-400">Need help? <Link href="/signup" className="underline">Contact us</Link>.</div>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </>
  );
}

