import React from "react";
import type { Metadata } from "next";
import Script from "next/script";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Tradia | AI Trading Journal, Trade Tracker & Performance Analytics",
  description:
    "Discover Tradia — the AI-powered trading journal and trade tracker built to improve trading performance. Track trades, analyze P&L, optimize risk, and grow consistency across Forex, forex, crypto and futures.",
  keywords: [
    "trading performance",
    "trade tracker",
    "trading journal",
    "ai trading journal",
    "forex trade journal",
    "crypto trading tracker",
    "stock trading analytics",
    "risk management",
    "win rate analysis",
    "pnl analytics",
    "trade log",
    "journal app for traders",
    "position sizing",
    "drawdown tracking",
  ],
  alternates: { canonical: "/about" },
  openGraph: {
    url: "/about",
    title: "About Tradia | AI Trading Journal, Trade Tracker & Performance Analytics",
    description:
      "Tradia helps traders track performance, journal trades, and get AI insights to boost consistency across Forex, forex, crypto, and futures.",
    type: "article",
    images: [
      {
        url: "/TradiaDashboard.png",
        width: 1200,
        height: 630,
        alt: "Tradia trading performance dashboard and trading journal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Tradia | AI Trading Journal & Trade Tracker",
    description:
      "AI trading journal and trade tracker to improve your win rate, P&L and risk management.",
    images: ["/TradiaDashboard.png"],
    creator: "@tradia_app",
  },
  robots: { index: true, follow: true },
};

export default function AboutPage(): React.ReactElement {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://tradiaai.app/" },
      { "@type": "ListItem", position: 2, name: "About", item: "https://tradiaai.app/about" },
    ],
  };

  const aboutPageLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About Tradia",
    url: "https://tradiaai.app/about",
    description:
      "Tradia is an AI-powered trading journal and trade tracker that helps traders analyze performance, optimize risk, and build consistent profitability.",
    isPartOf: {
      "@type": "WebSite",
      name: "Tradia",
      url: "https://tradiaai.app",
    },
    publisher: { "@type": "Organization", name: "Tradia" },
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white text-gray-900 dark:bg-[#061226] dark:text-gray-100">
        {/* Structured data for breadcrumbs and this page */}
        <Script id="ld-breadcrumb" type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify(breadcrumbLd)}
        </Script>
        <Script id="ld-about" type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify(aboutPageLd)}
        </Script>

        {/* HERO */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 pointer-events-none">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1400 600" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="about-g1" x1="0%" x2="100%">
                  <stop offset="0%" stopColor="#0ea5a4" stopOpacity="0.07" />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.05" />
                </linearGradient>
              </defs>
              <rect width="1400" height="600" fill="url(#about-g1)" />
            </svg>
          </div>
          <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7">
                <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-white">
                  About Tradia
                </h1>
                <p className="mt-5 text-lg text-gray-200 max-w-2xl">
                  Tradia is the AI trading journal, trade tracker and performance analytics platform
                  built to help traders improve win rate, protect capital with better risk management,
                  and scale consistent profitability across Forex, forex, crypto and futures.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/signup" className="px-5 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                    Get Started Free
                  </Link>
                  <Link href="/pricing" className="px-5 py-3 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20">
                    See Pricing
                  </Link>
                </div>
              </div>
              <div className="lg:col-span-5">
                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <h2 className="text-white text-xl font-semibold">What We Do</h2>
                  <ul className="mt-4 space-y-2 text-gray-200 text-sm">
                    <li>• Track every trade with a clean, fast trading journal</li>
                    <li>• Analyze trading performance: P&L, win rate, drawdown, expectancy</li>
                    <li>• Tag strategies and sessions to find your real edge</li>
                    <li>• AI insights to fix recurring mistakes and optimize risk</li>
                    <li>• Import trades via CSV and unify multiple accounts</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* WHY TRADIA */}
        <section className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Trading Performance You Can Trust",
                body:
                  "Understand P&L, win/loss distribution, and risk-adjusted returns with clear charts. Tradia helps you spot patterns fast and make data-driven decisions.",
              },
              {
                title: "A Journal You’ll Actually Use",
                body:
                  "Log trades in seconds, add notes and tags, and review your session with a frictionless, mobile-friendly experience.",
              },
              {
                title: "AI Coaching for Consistency",
                body:
                  "Turn your trade history into action. Our AI highlights mistakes, position sizing issues, and timing mismatches so you can improve faster.",
              },
            ].map((c) => (
              <div key={c.title} className="bg-white/70 dark:bg-[#0b1220]/70 border border-gray-200/70 dark:border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{c.title}</h3>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURES GRID (SEO KEYWORDS) */}
        <section className="max-w-7xl mx-auto px-6 py-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Trade Tracker, Trading Journal & Risk Tools</h2>
          <p className="mt-2 text-gray-700 dark:text-gray-300 max-w-3xl">
            Everything you need to manage your trading performance in one place. Whether you trade
            Forex, forex, crypto, or futures, Tradia brings a professional trading journal, flexible
            trade tracker, and intelligent risk analytics together so you can sharpen your edge.
          </p>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { title: "P&L & Win Rate", desc: "Instantly see profitability, expectancy and streaks." },
              { title: "Drawdown Tracking", desc: "Monitor risk and protect your capital." },
              { title: "Strategy Tags", desc: "Filter performance by setup, session or symbol." },
              { title: "CSV Import", desc: "Import trades from any broker in minutes." },
              { title: "Position Sizing", desc: "Size positions with data, not guesswork." },
              { title: "AI Insights", desc: "Uncover mistakes and optimize execution." },
            ].map((f) => (
              <div key={f.title} className="bg-white/70 dark:bg-[#0b1220]/70 border border-gray-200/70 dark:border-white/10 rounded-xl p-5">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{f.title}</h3>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SOCIAL PROOF */}
        <section className="max-w-7xl mx-auto px-6 py-10">
          <div className="bg-white/70 dark:bg-[#0b1220]/70 border border-gray-200/70 dark:border-white/10 rounded-xl p-6">
            <h2 className="text-2xl font-bold">Trusted by growing traders worldwide</h2>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              From first journal entry to funded consistency — traders choose Tradia to level up
              their process and protect their edge.
            </p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <blockquote className="bg-black/5 dark:bg-white/5 rounded-lg p-4">
                “Tradia showed me exactly where my sizing leaked. My RR improved in a week.” — Amina K.
              </blockquote>
              <blockquote className="bg-black/5 dark:bg-white/5 rounded-lg p-4">
                “Strategy tagging made my patterns obvious. I dropped the losers and scaled the winners.” — Sam R.
              </blockquote>
              <blockquote className="bg-black/5 dark:bg-white/5 rounded-lg p-4">
                “Clean exports and clear risk charts saved me hours every month.” — Noah P.
              </blockquote>
            </div>
          </div>
        </section>

        {/* FAQ (keyword-rich) */}
        <section className="max-w-7xl mx-auto px-6 py-8">
          <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                q: "What is a trading journal and why do traders need one?",
                a: "A trading journal records entries, exits and reasoning for every trade. It helps track performance, refine strategy, and improve discipline. Tradia makes journaling fast and provides analytics you can act on.",
              },
              {
                q: "Can I use Tradia as a trade tracker for Forex, forex and crypto?",
                a: "Yes. Tradia works across instruments — Forex, forex, crypto and futures. Import trades via CSV or add them manually.",
              },
              {
                q: "How does Tradia improve trading performance?",
                a: "Tradia surfaces win rate, P&L, drawdown and expectancy across strategy tags, sessions and symbols. Our AI flags mistakes and risk issues so you can adjust faster.",
              },
              {
                q: "Is my data secure?",
                a: "Your data is encrypted and protected by industry-standard best practices. You control your trading journal and exports.",
              },
            ].map((f) => (
              <div key={f.q} className="bg-white/70 dark:bg-[#0b1220]/70 border border-gray-200/70 dark:border-white/10 rounded-xl p-5">
                <h3 className="text-base font-semibold">{f.q}</h3>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-indigo-600 text-white rounded-2xl p-6">
            <div>
              <h2 className="text-xl font-bold">Start your trading journal today</h2>
              <p className="text-sm opacity-90">Track trades, analyze performance and get AI insights — free forever.</p>
            </div>
            <div className="flex gap-3">
              <Link href="/signup" className="px-5 py-3 bg-white text-indigo-700 rounded-lg hover:bg-gray-100">Create Account</Link>
              <Link href="/pricing" className="px-5 py-3 bg-indigo-500/40 border border-white/30 rounded-lg hover:bg-indigo-500/60">Explore Plans</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
