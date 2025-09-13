import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "About Tradia — AI Trading Performance Assistant",
  description:
    "Learn how Tradia helps traders analyze performance, eliminate emotional mistakes, and grow consistently with AI trade insights, MT5 integration, and risk controls.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white text-gray-900 dark:bg-[#061226] dark:text-gray-100 transition-colors">
        {/* HERO */}
        <section className="relative">
          <div className="absolute inset-0 pointer-events-none opacity-70 dark:opacity-30" aria-hidden>
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1400 600" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="about-g" x1="0%" x2="100%">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.06" />
                </linearGradient>
              </defs>
              <rect width="1400" height="600" fill="url(#about-g)" />
            </svg>
          </div>

          <div className="max-w-6xl mx-auto px-6 py-14 md:py-20">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              About Tradia
            </h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-3xl">
              Tradia is an AI trading performance assistant that helps you trade smarter and grow faster. We combine
              rich analytics, MT5 integrations, and human‑centred design to make trade reviews effortless, highlight
              blind spots, and build sustainable habits around risk and discipline.
            </p>
          </div>
        </section>

        {/* WHAT WE SOLVE */}
        <section className="max-w-6xl mx-auto px-6 py-8">
          <h2 className="text-2xl font-bold">What Tradia Solves</h2>
          <div className="mt-4 grid md:grid-cols-2 gap-6 text-gray-700 dark:text-gray-200">
            <div className="rounded-xl p-5 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
              <h3 className="font-semibold">Emotional & Psychological Pitfalls</h3>
              <p className="mt-2 text-sm leading-relaxed">
                Revenge trading, FOMO, hesitation, and overconfidence are common. Tradia detects streaks, flags risky
                behavior, and nudges healthy breaks with Risk Guard. Mood stamping and journal prompts help you reflect
                and regain control.
              </p>
            </div>
            <div className="rounded-xl p-5 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
              <h3 className="font-semibold">Risk & Discipline</h3>
              <p className="mt-2 text-sm leading-relaxed">
                Define daily loss limits, maximum trades, and loss‑streak breaks. Pro/Elite users get stronger stop
                banners to mirror prop‑firm constraints. Position sizing tools and SL/TP hints encourage consistent
                risk application.
              </p>
            </div>
            <div className="rounded-xl p-5 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
              <h3 className="font-semibold">Missed Opportunities & Noise</h3>
              <p className="mt-2 text-sm leading-relaxed">
                Tradia centralizes trade data, reveals patterns, and reduces noise. Our analytics spotlight high‑impact
                habits and profitable setups so you spend less time guessing and more time executing your edge.
              </p>
            </div>
            <div className="rounded-xl p-5 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
              <h3 className="font-semibold">Tracking & Accountability</h3>
              <p className="mt-2 text-sm leading-relaxed">
                A clean journal, calendar summaries, exportable reports, and plan tracking keep you accountable.
                You’ll know what works, what doesn’t, and where to focus next.
              </p>
            </div>
          </div>
        </section>

        {/* CORE FEATURES */}
        <section className="max-w-6xl mx-auto px-6 py-8">
          <h2 className="text-2xl font-bold">Core Features</h2>
          <ul className="mt-4 grid md:grid-cols-2 gap-6 text-sm text-gray-700 dark:text-gray-200">
            <li className="rounded-xl p-5 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
              <strong>AI Trade Insights:</strong> automatic analysis of results, risk patterns, and behavior hints.
            </li>
            <li className="rounded-xl p-5 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
              <strong>MT5 Integration & CSV Import:</strong> keep trades in sync or upload from any broker.
            </li>
            <li className="rounded-xl p-5 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
              <strong>Risk Guard:</strong> guardrails for overtrading, daily loss limits, and loss streak breaks.
            </li>
            <li className="rounded-xl p-5 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
              <strong>Journaling & Calendar:</strong> quick notes, mood stamps, and a monthly P/L calendar.
            </li>
            <li className="rounded-xl p-5 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
              <strong>Analytics Dashboards:</strong> drawdown, expectancy, patterns, and strategy comparisons.
            </li>
            <li className="rounded-xl p-5 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
              <strong>Exports & Reporting:</strong> share or back up your data for audits and accountability.
            </li>
          </ul>
        </section>

        {/* HOW IT WORKS */}
        <section className="max-w-6xl mx-auto px-6 py-8">
          <h2 className="text-2xl font-bold">How Tradia Works</h2>
          <ol className="mt-4 grid gap-4 md:grid-cols-3 text-sm text-gray-700 dark:text-gray-200">
            <li className="rounded-xl p-5 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
              <strong>1) Connect or Import:</strong> Link MT5 accounts or upload CSV history from your broker.
            </li>
            <li className="rounded-xl p-5 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
              <strong>2) Analyze:</strong> AI summarizes your performance, highlights issues, and surfaces patterns.
            </li>
            <li className="rounded-xl p-5 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
              <strong>3) Improve:</strong> Use risk controls, journals, and dashboards to refine execution.
            </li>
          </ol>
        </section>

        {/* PLANS */}
        <section className="max-w-6xl mx-auto px-6 py-8">
          <h2 className="text-2xl font-bold">Plans & Access</h2>
          <div className="mt-4 grid md:grid-cols-2 gap-6 text-sm text-gray-700 dark:text-gray-200">
            <div className="rounded-xl p-5 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
              <strong>Free (Starter):</strong> core analytics, 30‑day history, CSV import.
            </div>
            <div className="rounded-xl p-5 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
              <strong>Plus:</strong> unlimited history, more connections, AI reviews.
            </div>
            <div className="rounded-xl p-5 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
              <strong>Pro:</strong> advanced insights, enhanced risk layers, MT5 workflows.
            </div>
            <div className="rounded-xl p-5 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
              <strong>Elite:</strong> everything in Pro with premium features and priority support.
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
            Billing is processed securely via Flutterwave. Subscriptions can be managed in your dashboard.
          </p>
        </section>

        {/* SECURITY */}
        <section className="max-w-6xl mx-auto px-6 py-8">
          <h2 className="text-2xl font-bold">Security & Privacy</h2>
          <div className="mt-4 grid md:grid-cols-2 gap-6 text-sm text-gray-700 dark:text-gray-200">
            <div className="rounded-xl p-5 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
              <strong>Data Encryption:</strong> sensitive credentials are encrypted and stored with strict policies.
            </div>
            <div className="rounded-xl p-5 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
              <strong>Minimal Access:</strong> we only request data required for syncing and analytics.
            </div>
            <div className="rounded-xl p-5 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
              <strong>Export & Portability:</strong> your data is yours — export it anytime.
            </div>
            <div className="rounded-xl p-5 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
              <strong>Transparent Policies:</strong> see our Privacy Policy and Terms for full details.
            </div>
          </div>
        </section>

        {/* ROADMAP */}
        <section className="max-w-6xl mx-auto px-6 py-8">
          <h2 className="text-2xl font-bold">Roadmap & Vision</h2>
          <p className="mt-4 text-sm text-gray-700 dark:text-gray-200 leading-relaxed max-w-4xl">
            We’re building a trader‑first platform: faster analytics, smarter insights, and better workflows. Upcoming
            items include richer broker integrations, personal alert rules, more coaching content, and community
            features for safe, focused feedback — without the noise.
          </p>
        </section>

        {/* CTA */}
        <section className="max-w-6xl mx-auto px-6 py-10">
          <div className="rounded-2xl p-6 border border-indigo-300/40 dark:border-indigo-500/30 bg-indigo-50/60 dark:bg-indigo-500/10">
            <h3 className="text-xl font-semibold">Start Free — Upgrade Anytime</h3>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-200 max-w-3xl">
              Create your free account, connect MT5 or import your trades, and let Tradia highlight the next best
              improvements in your process. It only takes a few minutes to see your first insights.
            </p>
            <div className="mt-4 flex gap-3">
              <a href="/signup" className="px-4 py-2 rounded-md bg-indigo-600 text-white font-semibold hover:bg-indigo-500">
                Create free account
              </a>
              <a href="/pricing" className="px-4 py-2 rounded-md border border-indigo-500 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/10">
                See plans
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

