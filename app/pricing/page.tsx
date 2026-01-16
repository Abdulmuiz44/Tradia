// src/app/pricing/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { AiOutlineCheck, AiOutlineArrowRight } from "react-icons/ai";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PLAN_LIMITS, type PlanType } from "@/lib/planAccess";
import { getCheckoutUrl } from "@/lib/checkout-urls";


/**
 * Pricing page
 * Path: /pricing -> app/pricing/page.tsx or src/app/pricing/page.tsx
 *
 * Matches visual style and content structure of the landing page (app/page.tsx)
 * - Billing toggle (monthly/yearly)
 * - Plan grid with highlights, CTA, and select state
 * - Comparison link to signup and CTA sections
 * - Testimonials, FAQ, and benefits
 */

const PLANS = [
  {
    id: "free",
    name: "Starter",
    monthly: 0,
    yearly: 0,
    highlights: ["Basic trade analytics", "30 days trade history", "CSV trade import"],
    cta: "Get started (Free)",
    tag: "Free forever",
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 9,
    yearly: 90,
    highlights: [
      "All Starter features",
      "6 months trade history",
      "Advanced analytics",
      "AI weekly summary",
      "Personalized strategy recommendations",
      "Risk management analysis & optimization"
    ],
    cta: "Upgrade to Pro",
    tag: "Most popular",
  },
  {
    id: "plus",
    name: "Plus",
    monthly: 19,
    yearly: 190,
    highlights: [
      "All Pro features",
      "Unlimited history",
      "Advanced AI features",
      "AI trade reviews & SL/TP suggestions",
      "Image processing for trade screenshots",
      "Real-time performance analytics & insights"
    ],
    cta: "Upgrade to Plus",
    tag: "For active traders",
  },
  {
    id: "elite",
    name: "Elite",
    monthly: 39,
    yearly: 390,
    highlights: [
      "Everything in Plus",
      "Premium AI features",
      "AI strategy builder",
      "Prop-firm dashboard",
      "All AI features included",
      "Priority support"
    ],
    cta: "Upgrade to Elite",
    tag: "Advanced",
  },
];

const FEATURES = [
  { title: "Smart Performance Tracking", desc: "Real-time metrics, charts and behavioral insights to level-up your trading." },
  { title: "Secure & Private", desc: "Your trading data is encrypted and accessible only to you." },
  { title: "Lightning-Fast Feedback", desc: "AI-powered trade reviews & suggestions in seconds." },
  { title: "Trade Anywhere", desc: "Responsive web app and mobile-friendly dashboards for traders on the move." },
];

const TESTIMONIALS = [
  { name: "Amina K.", role: "Scalper", text: "Tradia pinpointed my sizing leaks and improved my RR immediately.", initials: "A" },
  { name: "Sam R.", role: "Swing Trader", text: "Tagging strategies changed everything — now I trade the winners.", initials: "S" },
  { name: "Noah P.", role: "Risk Manager", text: "Audit-ready exports and clear risk charts saved our team hours.", initials: "N" },
];

export default function PricingPage(): React.ReactElement {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<string>("pro");
  const [testimonialIdx, setTestimonialIdx] = useState<number>(0);
  const [coachPoints, setCoachPoints] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/coach/points', { cache: 'no-store' });
        if (res.ok) { const j = await res.json(); setCoachPoints(Number(j.points || 0)); }
      } catch { }
    })();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTestimonialIdx((i) => (i + 1) % TESTIMONIALS.length), 6000);
    return () => clearInterval(id);
  }, []);

  const priceFor = (planId: string) => {
    const p = PLANS.find((x) => x.id === planId)!;
    return billing === "monthly" ? p.monthly : p.yearly;
  };

  // JSON-LD: Offer catalog and pricing FAQ
  const offerJsonLd = {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    "name": "Tradia Plans",
    "url": "https://tradiaai.app/pricing",
    "itemListElement": [
      {
        "@type": "Offer",
        "name": "Pro (monthly)",
        "price": 9,
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
        "url": "https://tradiaai.app/checkout?plan=pro&billing=monthly",
        "category": "SoftwareApplication",
        "description": "6 months trade history, AI weekly summary, personalized strategy recommendations",
      },
      {
        "@type": "Offer",
        "name": "Plus (monthly)",
        "price": 19,
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
        "url": "https://tradiaai.app/checkout?plan=plus&billing=monthly",
        "category": "SoftwareApplication",
        "description": "Unlimited history, AI trade reviews, image processing for trade screenshots",
      },
      {
        "@type": "Offer",
        "name": "Elite (monthly)",
        "price": 39,
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
        "url": "https://tradiaai.app/checkout?plan=elite&billing=monthly",
        "category": "SoftwareApplication",
        "description": "AI strategy builder, Prop-firm dashboard, all AI features included",
      }
    ]
  } as const;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Is there a free plan?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes — the Starter plan is free forever and includes core analytics, CSV import, and 30 days of trade history. No credit card required."
        }
      },
      {
        "@type": "Question",
        "name": "Can I upgrade or downgrade anytime?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, you can upgrade, downgrade, or cancel anytime. Annual plans get a 20% discount and are billed upfront. Monthly plans are billed every 30 days."
        }
      },
      {
        "@type": "Question",
        "name": "What payment methods do you accept?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "We accept all major credit cards through our secure payment processor. Billing happens automatically on your billing date each month or year."
        }
      }
    ]
  } as const;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(offerJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Navbar />

      <main className="min-h-screen bg-white text-black dark:bg-[#0f1319] dark:text-gray-100 transition-colors">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div className="max-w-6xl mx-auto px-6 py-20 lg:py-28">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7">
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                  className="text-4xl sm:text-5xl lg:text-5xl font-extrabold leading-tight brand-text-gradient"
                >
                  Simple pricing. Powerful results.
                </motion.h1>

                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }} className="mt-6 text-lg text-black dark:text-white max-w-2xl">
                  Start free with Starter plan. Upgrade to Pro, Plus, or Elite for advanced AI analysis, extended history, and real-time insights. No hidden fees — upgrade or downgrade anytime.
                </motion.p>

                <div className="mt-8 flex flex-wrap gap-3 items-center">
                  <Link href="/signup" className="inline-flex items-center gap-3 bg-white text-black hover:bg-gray-200 px-6 py-3 rounded-full shadow-lg font-semibold border border-gray-300">
                    Create free account <AiOutlineArrowRight />
                  </Link>

                  <a className="inline-flex items-center gap-2 px-5 py-3 rounded-full border-2 border-black dark:border-white text-black dark:text-white font-semibold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors" href="#plans">
                    See plans
                  </a>
                </div>

                <div className="mt-6 flex gap-6 items-center">
                  <div className="text-sm text-gray-400">Trusted by traders worldwide • Finance-grade export & privacy</div>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-black/20 to-white/5 p-4 shadow-2xl backdrop-blur-sm">
                  <Image
                    src="/TradiaDashboard.png"
                    alt="Tradia dashboard"
                    fill
                    className="rounded object-cover"
                    sizes="(min-width: 1024px) 480px, 100vw"
                    priority
                  />
                </div>
                <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">Preview of the analytics dashboard — see it with your own trades after signup.</div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing toggle + CTA */}
        <section id="plans" className="py-10 px-6">
          <div className="max-w-6xl mx-auto text-center">
            {coachPoints !== null && (
              <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-black dark:text-white text-sm">
                Your Coach points: <span className="font-bold">{coachPoints}</span>
              </div>
            )}
            <div className="inline-flex rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-sm border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setBilling("monthly")}
                className={`px-4 py-2 rounded-full font-semibold ${billing === "monthly" ? "bg-black dark:bg-white text-white dark:text-black" : "text-black dark:text-gray-300"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling("yearly")}
                className={`px-4 py-2 rounded-full font-semibold ${billing === "yearly" ? "bg-black dark:bg-white text-white dark:text-black" : "text-black dark:text-gray-300"}`}
              >
                Yearly (save 20%)
              </button>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {PLANS.map((p) => {
                const price = priceFor(p.id);
                const selected = selectedPlan === p.id;
                return (
                  <motion.div
                    key={p.id}
                    whileHover={{ y: -6 }}
                    className={`p-6 rounded-xl border ${selected ? "border-black dark:border-white shadow-xl bg-white dark:bg-gray-900" : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"} transition-colors`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold">{p.name}</h3>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{p.tag}</div>
                      </div>

                      <div className="text-2xl font-extrabold">
                        {price === 0 ? "Free" : `$${price}`}
                        <div className="text-xs font-medium text-gray-600 dark:text-gray-400">{price === 0 ? "" : billing === "monthly" ? "/mo" : "/yr"}</div>
                      </div>
                    </div>

                    <ul className="mb-6 space-y-2 text-left">
                      {p.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <AiOutlineCheck className="mt-1 text-black dark:text-white flex-shrink-0 text-lg" />
                          <span className="font-semibold text-black dark:text-white">{h}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="flex flex-col gap-3">
                      <button
                        onClick={async () => {
                          setSelectedPlan(p.id);
                          if (p.monthly === 0) {
                            window.location.href = "/signup";
                            return;
                          }
                          const checkoutUrl = getCheckoutUrl(p.id as "pro" | "plus" | "elite", billing as "monthly" | "yearly");
                          window.location.href = checkoutUrl;
                        }}
                        className={`w-full py-3 rounded-lg font-semibold ${selected ? "bg-white text-black hover:bg-gray-200 border border-gray-300" : "bg-gray-200 text-black hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"} transition-colors`}
                      >
                        {p.cta}
                      </button>

                      <Link href="/pricing" className="text-center text-sm text-gray-500 dark:text-gray-400 hover:underline">
                        Compare plans
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
              Need a custom plan, bulk/team pricing or prop-firm support?{" "}
              <Link href="/contact" className="text-black dark:text-white underline">Contact us</Link>.
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-12 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold">Why traders choose Tradia</h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">Everything you need to analyze, improve and scale — built around real trading workflows.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {FEATURES.map((f, i) => (
                <motion.div key={i} whileHover={{ y: -6 }} className="p-6 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-transparent shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-indigo-700/10 text-indigo-300">
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.2" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-black dark:text-white">{f.title}</h3>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{f.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <h3 className="text-2xl font-bold mb-3">Loved by traders worldwide</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8">Tradia helps traders find edge, limit mistakes and scale their edge.</p>

            <div className="grid gap-6 md:grid-cols-3">
              {TESTIMONIALS.map((t, i) => (
                <motion.div key={i} whileHover={{ y: -6 }} className="p-6 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gradient-to-br dark:from-black/20 dark:to-white/5">
                  <div className="flex items-center gap-4 mb-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg,#7c3aed,#06b6d4)" }}
                    >
                      <span className="text-white font-bold">{t.initials}</span>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-black dark:text-gray-100">{t.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{t.role}</div>
                    </div>
                  </div>

                  <p className="text-gray-700 dark:text-gray-300">&ldquo;{t.text}&rdquo;</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ + CTA */}
        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">Frequently asked questions</h3>

              <div className="space-y-3">
                {[
                  { q: "Is there a free plan?", a: "Yes — Starter is free forever and includes core analytics, CSV import, and 30 days of trade history. No credit card required." },
                  { q: "Which integrations are supported?", a: "CSV imports are supported for comprehensive trade analysis. Email us at support@tradiaai.app for API integration requests." },
                  { q: "Can I upgrade or downgrade anytime?", a: "Yes, you can upgrade, downgrade, or cancel anytime. Annual plans get a 20% discount and are billed upfront. Monthly plans are billed every 30 days." },
                ].map((fq, i) => (
                  <details key={i} className="p-4 rounded-xl border border-gray-200 dark:border-white/10">
                    <summary className="font-medium text-black dark:text-white">{fq.q}</summary>
                    <p className="mt-2 text-gray-700 dark:text-white">{fq.a}</p>
                  </details>
                ))}
              </div>
            </div>

            <div className="rounded-xl p-8 border border-gray-200 dark:border-white/10 bg-white dark:bg-gradient-to-br dark:from-indigo-600/8 dark:to-pink-500/6">
              <h4 className="text-xl font-bold text-black dark:text-white">Ready to level up your trading?</h4>
              <p className="mt-2 text-gray-700 dark:text-gray-300">Create an account, upload trades and see AI-driven insights tuned to your history.</p>
              <div className="mt-6 flex gap-3">
                <Link href="/signup" className="bg-white text-black px-4 py-2 rounded-full font-semibold hover:bg-gray-200 border border-gray-300">Create free account</Link>
                <Link href="#plans" className="px-4 py-2 rounded-full border-2 border-black dark:border-white text-black dark:text-white font-semibold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors">Compare plans</Link>
              </div>

              <div className="mt-6 text-xs text-gray-600 dark:text-gray-400">Need custom pricing or prop-firm features? <Link href="/contact" className="underline">Contact our team</Link>.</div>
            </div>
          </div>
        </section>



        <Footer />
      </main>
    </>
  );
}



