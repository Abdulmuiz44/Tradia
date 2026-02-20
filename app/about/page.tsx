import React from "react";
import type { Metadata } from "next";
import Script from "next/script";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Tradia — Built for Forex & Prop Firm Traders",
  description:
    "Discover Tradia — the AI-powered trading journal built specifically for Forex and Prop Firm traders. Protect your drawdown, analyze session performance, and scale your funded career.",
  keywords: [
    "Forex trading journal",
    "Prop firm trade tracker",
    "funded trader analytics",
    "drawdown management tool",
    "AI trading coach",
    "MetaTrader journal sync",
  ],
  alternates: { canonical: "/about" },
  openGraph: {
    url: "/about",
    title: "About Tradia | AI Trading Journal, Trade Tracker & Performance Analytics",
    description:
      "Tradia helps traders track performance, journal trades, and get AI insights to boost consistency across Forex, stocks, crypto, and futures.",
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
      <main className="min-h-screen bg-white text-gray-900 dark:bg-[#0f1319] dark:text-gray-100">
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
                  Tradia's mission is to provide Forex and Prop Firm traders with institutional-grade
                  analytics and AI coaching. We help you eliminate the guesswork, protect your equity,
                  and scale consistent profitability in your funded journey.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/signup" className="px-5 py-3 bg-white text-black rounded-lg hover:bg-gray-200 font-semibold border border-gray-300">
                    Get Started Free
                  </Link>
                  <Link href="/pricing" className="px-5 py-3 bg-transparent border-2 border-white text-white rounded-lg hover:bg-white hover:text-black font-semibold transition-colors">
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
              <div key={c.title} className="bg-white/70 dark:bg-[#0f1319]/70 border border-gray-200/70 dark:border-white/10 rounded-xl p-6">
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
            Whether you're tackling a new Prop Firm challenge or managing a $200k funded account,
            Tradia brings a professional trading command center to your fingertips. We prioritize
            the metrics that matter most to Forex specialists: drawdown preservation, session win rates,
            and psychological discipline.
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
              <div key={f.title} className="bg-white/70 dark:bg-[#0f1319]/70 border border-gray-200/70 dark:border-white/10 rounded-xl p-5">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{f.title}</h3>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SOCIAL PROOF */}
        <section className="max-w-7xl mx-auto px-6 py-10">
          <div className="bg-white/70 dark:bg-[#0f1319]/70 border border-gray-200/70 dark:border-white/10 rounded-xl p-6">
            <h2 className="text-2xl font-bold">Trusted by growing traders worldwide</h2>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              From first journal entry to funded consistency — traders choose Tradia to level up
              their process and protect their edge.
            </p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <blockquote className="bg-black/5 dark:bg-white/5 rounded-lg p-4">
                “Tradia fixed my drawdown leaks. I passed my 100k evaluation in 2 weeks after following the AI's session advice.” — Amina K.
              </blockquote>
              <blockquote className="bg-black/5 dark:bg-white/5 rounded-lg p-4">
                “Tagging my 'ICT Silver Bullet' setups revealed I was actually losing money on them. Tradia saved my capital.” — Sam R.
              </blockquote>
              <blockquote className="bg-black/5 dark:bg-white/5 rounded-lg p-4">
                “The London session analytics are elite. I now know exactly when to walk away from the screens.” — Noah P.
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
                q: "Does Tradia support Prop Firm evaluations?",
                a: "Yes. Tradia is specifically optimized for Prop Firm traders. Our dashboard tracks daily/max drawdown and consistency scores to help you stay compliant with your firm's rules.",
              },
              {
                q: "Can I import my MT4/MT5 trade history?",
                a: "Yes. You can easily export your history from MetaTrader as a CSV and upload it to Tradia for instant AI analysis and deep metric breakdowns.",
              },
              {
                q: "Which Forex pairs does it support?",
                a: "Tradia supports all major, minor, and exotic Forex pairs, along with commodities like Gold (XAUUSD) and Oil, which are favorites among prop traders.",
              },
              {
                q: "How does the AI Coaching work?",
                a: "The AI analyzes your trading patterns over time to find 'behavioral leaks'. It will tell you if you're overtrading during the Asian session or if your stop losses are too tight for your strategy.",
              },
            ].map((f) => (
              <div key={f.q} className="bg-white/70 dark:bg-[#0f1319]/70 border border-gray-200/70 dark:border-white/10 rounded-xl p-5">
                <h3 className="text-base font-semibold">{f.q}</h3>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-100 dark:bg-[#0f1319] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-2xl p-6">
            <div>
              <h2 className="text-xl font-bold">Start your trading journal today</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Track trades, analyze performance and get AI insights — free forever.</p>
            </div>
            <div className="flex gap-3">
              <Link href="/signup" className="px-5 py-3 bg-white text-black rounded-lg hover:bg-gray-200 font-semibold border border-gray-300">Create Account</Link>
              <Link href="/pricing" className="px-5 py-3 border-2 border-black dark:border-white text-black dark:text-white rounded-lg hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black font-semibold transition-colors">Explore plans</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
