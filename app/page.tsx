
"use client";

import React, { useEffect, useState, lazy, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
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
    { title: "Performance Analytics", desc: "Comprehensive charts and metrics for better trading decisions." },
];

const PLANS = [
    {
        id: "starter",
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
            "AI strategy builder",
            "Prop-firm dashboard",
            "All AI features included",
            "Priority support"
        ],
        cta: "Upgrade to Elite",
        tag: "Advanced",
    },
];

const TESTIMONIALS = [
    { name: "Amina K.", role: "Scalper", text: "Tradia pinpointed my sizing leaks and improved my RR immediately.", initials: "A" },
    { name: "Sam R.", role: "Swing Trader", text: "Tagging strategies changed everything — now I trade the winners.", initials: "S" },
    { name: "Noah P.", role: "Risk Manager", text: "Audit-ready exports and clear risk charts saved our team hours.", initials: "N" },
];

/* Loading component for lazy loading */
const LoadingSpinner = () => (
    <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
    </div>
);

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
        return billing === "monthly" ? p.monthly : p.yearly;
    };

    return (
        <>
            <Navbar />

            <main className="min-h-screen bg-white text-black dark:bg-black dark:text-white transition-colors">
                {/* HERO */}
                <section className="relative overflow-hidden bg-white dark:bg-black">
                    <div className="absolute inset-0 -z-10 pointer-events-none">
                        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1400 600" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id="g1" x1="0%" x2="100%">
                                    <stop offset="0%" stopColor="#0ea5a4" stopOpacity="0.15" />
                                    <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.1" />
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
                                    className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight text-gray-900 dark:text-white"
                                >
                                    Stop Guessing Trades — AI Uncovers Your Winning Edge in 30 Seconds
                                </motion.h1>

                                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }} className="mt-6 text-lg text-gray-600 dark:text-gray-300 max-w-2xl">
                                    Traders like you boosted win rates 20% — upload a sample trade to see yours free.
                                </motion.p>

                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.24 }} className="mt-4 text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
                                    Join thousands of traders who use Tradia to analyze their trading performance, identify patterns, optimize strategies, and make data-driven decisions that lead to consistent profits in the financial markets.
                                </motion.div>

                                <div className="mt-8 flex flex-wrap gap-3 items-center">
                                    <motion.button onClick={navSignup} whileTap={{ scale: 0.98 }} className="inline-flex items-center gap-3 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 px-6 py-3 rounded-full shadow-lg font-semibold">
                                        Get Your Free AI Review <AiOutlineArrowRight />
                                    </motion.button>

                                    <Link
                                        href="/pricing"
                                        className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-black dark:border-white text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900"
                                    >
                                        View plans
                                    </Link>

                                    <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-black dark:text-white text-xs font-semibold">
                                        New: AI Mental Coach
                                    </span>

                                    {/* ROI widget */}
                                    <div className="w-full">
                                        {(() => {
                                            const ROICalc = require("@/components/marketing/ROICalculator").default;
                                            return <ROICalc />;
                                        })()}
                                    </div>
                                </div>

                                {/* trust metrics removed per request */}
                            </div>

                            {/* Dashboard mockup */}
                            <div className="lg:col-span-5">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.12 }}
                                    className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-black/20 to-white/5 shadow-2xl backdrop-blur-sm"
                                >
                                    <Image
                                        src="/TradiaDashboard.png"
                                        alt="Tradia trading dashboard showing performance analytics, trade charts, and AI insights for forex and financial market traders"
                                        fill
                                        className="object-cover"
                                        sizes="(min-width: 1024px) 540px, 100vw"
                                        priority
                                    />
                                </motion.div>

                                <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">Live dashboard preview (Upload trade history to see interactive charts).</div>
                            </div>
                        </div>
                    </div>

                </section>

                {/* FEATURES */}
                <section className="py-12 px-6 bg-white dark:bg-black">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold text-black dark:text-white">Advanced Trading Analytics Platform</h2>
                            <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">Everything traders need to analyze performance, improve strategies and scale profits — built around real trading workflows and powered by artificial intelligence.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {FEATURES_ORIG.map((f, i) => (
                                <motion.div key={i} whileHover={{ y: -6 }} className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 shadow-sm">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 rounded-lg bg-gray-200 dark:bg-gray-800 text-black dark:text-white">{f.icon}</div>
                                        <div>
                                            <h3 className="font-semibold text-lg text-black dark:text-white">{f.title}</h3>
                                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{f.description}</p>
                                            {/* Add feature examples */}
                                            {i === 0 && <p className="mt-2 text-xs text-gray-500">Example: Track your EUR/USD win rate from 45% to 62% after optimizing entries.</p>}
                                            {i === 1 && <p className="mt-2 text-xs text-gray-500">Example: End-to-end encryption ensures your trade data stays private.</p>}
                                            {i === 2 && <p className="mt-2 text-xs text-gray-500">Example: Get AI feedback on your last 10 trades in under 30 seconds.</p>}
                                            {i === 3 && <p className="mt-2 text-xs text-gray-500">Example: Access your analytics on mobile while traveling.</p>}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="mt-8 text-center">
                            <button onClick={navSignup} className="inline-flex items-center gap-2 rounded-full px-6 py-3 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 font-semibold shadow">
                                Start Trading Analysis Free <AiOutlineArrowRight />
                            </button>
                        </div>
                    </div>
                </section>

                {/* VIDEO DEMO */}
                <section className="py-16 px-6 bg-gray-100 dark:bg-gray-900">
                    <div className="max-w-6xl mx-auto text-center">
                        <h2 className="text-3xl font-bold mb-4 text-black dark:text-white">See Tradia in Action</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                            Watch how traders use Tradia to analyze their performance, get AI insights, and improve their strategies.
                            From uploading trades to seeing actionable recommendations.
                        </p>

                        <div className="relative w-full max-w-4xl mx-auto">
                            <div className="aspect-video rounded-xl overflow-hidden shadow-2xl bg-gray-200 dark:bg-black border border-gray-300 dark:border-gray-700">
                                <video
                                    className="w-full h-full"
                                    src="/TRADIA_FILTER_LOGIC.mkv"
                                    controls
                                    playsInline
                                    preload="metadata"
                                    poster="/TradiaDashboard.png"
                                >
                                    Your browser does not support the video tag. You can
                                    <a href="/TRADIA_FILTER_LOGIC.mkv" className="text-black dark:text-white underline">download the video here</a>.
                                </video>
                            </div>
                        </div>

                        <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                            Demo video showing dashboard features, trade analysis, and AI recommendations.
                        </div>
                    </div>
                </section>

                {/* WHY CHOOSE TRADIA */}
                <section className="py-16 px-6 bg-white dark:bg-black">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Why Professional Traders Choose Tradia</h2>
                            <p className="text-gray-700 dark:text-gray-300 max-w-3xl mx-auto text-lg">
                                Join thousands of successful traders who have transformed their trading performance using our comprehensive analytics platform.
                                From day traders to swing traders, Tradia provides the insights and tools needed to trade with confidence.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <AiOutlineBarChart className="w-8 h-8 text-black dark:text-white" />
                                </div>
                                <h3 className="text-xl font-semibold mb-3 text-black dark:text-white">Data-Driven Trading Decisions</h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Make informed trading decisions based on comprehensive performance analytics. Track your win rate,
                                    risk-reward ratios, and identify patterns that lead to profitable trades. Our platform helps you
                                    understand what works in your trading strategy.
                                </p>
                            </div>

                            <div className="text-center">
                                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <AiOutlineThunderbolt className="w-8 h-8 text-black dark:text-white" />
                                </div>
                                <h3 className="text-xl font-semibold mb-3 text-black dark:text-white">AI-Powered Trade Analysis</h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Leverage artificial intelligence to analyze your trading performance. Get automated insights,
                                    trade reviews, and recommendations for improving your entry and exit strategies. Our AI
                                    identifies mistakes and suggests optimizations for better trading results.
                                </p>
                            </div>

                            <div className="text-center">
                                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <AiOutlineGlobal className="w-8 h-8 text-black dark:text-white" />
                                </div>
                                <h3 className="text-xl font-semibold mb-3 text-black dark:text-white">Comprehensive Trading Analytics</h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Get detailed insights into your trading performance with advanced analytics and AI-powered recommendations.
                                    Whether you trade forex, stocks, commodities, or cryptocurrencies, Tradia provides
                                    comprehensive analysis to help you improve your trading strategies.
                                </p>
                            </div>

                            <div className="text-center">
                                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <AiOutlineLock className="w-8 h-8 text-black dark:text-white" />
                                </div>
                                <h3 className="text-xl font-semibold mb-3 text-black dark:text-white">Secure & Private Trading Data</h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Your trading data is encrypted and stored securely. We prioritize your privacy and never share
                                    your personal trading information. Focus on improving your trading performance without worrying
                                    about data security or privacy concerns.
                                </p>
                            </div>

                            <div className="text-center">
                                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <AiOutlineCheck className="w-8 h-8 text-black dark:text-white" />
                                </div>
                                <h3 className="text-xl font-semibold mb-3 text-black dark:text-white">Real-Time Performance Tracking</h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Monitor your trading performance in real-time with comprehensive metrics and visualizations.
                                    Track your progress, identify trends, and make adjustments to your trading strategy based on
                                    current market conditions and historical performance data.
                                </p>
                            </div>

                            <div className="text-center">
                                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <AiOutlineGlobal className="w-8 h-8 text-black dark:text-white" />
                                </div>
                                <h3 className="text-xl font-semibold mb-3 text-black dark:text-white">Mobile Trading Analytics</h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Access your trading analytics anywhere with our mobile-responsive platform. Review your
                                    performance, analyze trades, and get AI insights on your smartphone or tablet. Stay connected
                                    to your trading data no matter where you are in the world.
                                </p>
                            </div>
                        </div>

                        <div className="text-center mt-12">
                            <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
                                Ready to take your trading to the next level? Join successful traders worldwide who use Tradia
                                to analyze, improve, and scale their trading performance.
                            </p>
                            <button onClick={navSignup} className="inline-flex items-center gap-2 rounded-full px-8 py-4 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 font-semibold shadow-lg text-lg transition-all">
                                Start Your Trading Journey <AiOutlineArrowRight />
                            </button>
                        </div>
                    </div>
                </section>

                {/* BENEFITS + INSIGHT */}
                <section className="py-14 px-6 bg-gray-50 dark:bg-black">
                    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Benefits</h3>
                            <p className="mt-3 text-gray-600 dark:text-gray-400">Powerful analytics wrapped in a friendly UI — built for traders who trade.</p>

                            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {BENEFITS.slice(0, 4).map((b, i) => (
                                    <div key={i} className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50">
                                        <div className="font-semibold text-gray-900 dark:text-gray-100">{b.title}</div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{b.desc}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="relative overflow-hidden rounded-xl border border-gray-300 dark:border-white/10 shadow-md">
                                <Image
                                    src="/TradiaInsights.png"
                                    alt="Tradia AI trading insights showing performance analysis, risk metrics, and actionable recommendations for traders"
                                    fill
                                    className="object-cover"
                                    sizes="(min-width: 1024px) 560px, 100vw"
                                />
                            </div>
                            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">Insights preview — automated, actionable, and tailored to your account history.</div>
                        </div>
                    </div>
                </section>

                {/* Pricing */}
                <section className="py-16 px-6 bg-white dark:bg-black">
                    <div className="max-w-6xl mx-auto text-center">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Simple, Transparent Pricing</h2>
                        <p className="mt-2 text-gray-700 dark:text-gray-300">Start free with Starter plan — upgrade to unlock advanced AI features, extended history, and real-time insights.</p>

                        <div className="mt-6 inline-flex rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-sm border border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => setBilling("monthly")}
                                className={`px-4 py-2 rounded-full font-semibold ${billing === "monthly" ? "bg-black dark:bg-white text-white dark:text-black" : "text-gray-600 dark:text-gray-300"}`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setBilling("yearly")}
                                className={`px-4 py-2 rounded-full font-semibold ${billing === "yearly" ? "bg-black dark:bg-white text-white dark:text-black" : "text-gray-600 dark:text-gray-300"}`}
                            >
                                Yearly (save 20%)
                            </button>
                        </div>

                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {PLANS.map((p) => {
                                const price = billing === "monthly" ? p.monthly : p.yearly;
                                const selected = selectedPlan === p.id;
                                return (
                                    <motion.div
                                        key={p.id}
                                        whileHover={{ y: -6 }}
                                        className={`p-6 rounded-xl border ${selected ? "border-black dark:border-white shadow-xl bg-white dark:bg-gray-900" : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"} transition-colors`}
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{p.name}</h3>
                                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{p.tag}</div>
                                            </div>

                                            <div className="text-2xl font-extrabold text-gray-900 dark:text-white">
                                                {price === 0 ? "Free" : `$${price}`}
                                                <div className="text-xs font-medium text-gray-600 dark:text-gray-400">{price === 0 ? "" : billing === "monthly" ? "/mo" : "/yr"}</div>
                                            </div>
                                        </div>

                                        <ul className="mb-6 space-y-2 text-left">
                                            {p.highlights.map((h, i) => (
                                                <li key={i} className="flex items-start gap-2">
                                                    <AiOutlineCheck className="mt-1 text-black dark:text-white" />
                                                    <span className="text-gray-700 dark:text-gray-200 font-medium">{h}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        <div className="flex flex-col gap-3">
                                            <button
                                                onClick={() => {
                                                    setSelectedPlan(p.id);
                                                    navSignup();
                                                }}
                                                className={`w-full py-3 rounded-lg font-semibold ${selected ? "bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200" : "bg-gray-800 dark:bg-gray-100 text-white dark:text-black hover:bg-gray-700 dark:hover:bg-gray-200"} transition-colors`}
                                            >
                                                {p.cta}
                                            </button>

                                            <Link href="/pricing" className="text-center text-sm text-gray-600 dark:text-gray-400 hover:underline">
                                                Compare plans
                                            </Link>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
                            Need a custom plan or prop-firm support? <Link href="/contact" className="text-indigo-600 dark:text-indigo-300 hover:underline">Contact us</Link>.
                        </div>
                    </div>
                </section>

                {/* Testimonials */}
                <section className="py-16 px-6 bg-gray-50 dark:bg-black">
                    <div className="max-w-6xl mx-auto text-center">
                        <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">Loved by traders worldwide</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-8">Traders use Tradia to find edge, reduce mistakes and scale.</p>

                        <div className="grid gap-6 md:grid-cols-3">
                            {TESTIMONIALS.map((t, i) => (
                                <motion.div key={i} whileHover={{ y: -6 }} className="p-6 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-gradient-to-br dark:from-black/20 dark:to-white/5 shadow-sm dark:shadow-none">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div
                                            className="w-12 h-12 rounded-full flex items-center justify-center"
                                            style={{ background: "linear-gradient(135deg,#7c3aed,#06b6d4)" }}
                                        >
                                            <span className="text-white font-bold">{t.initials}</span>
                                        </div>
                                        <div className="text-left">
                                            <div className="font-semibold text-gray-900 dark:text-gray-100">{t.name}</div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">{t.role}</div>
                                        </div>
                                    </div>

                                    <p className="text-gray-700 dark:text-gray-300">&ldquo;{t.text}&rdquo;</p>
                                </motion.div>
                            ))}
                        </div>

                        <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">All testimonials anonymized to respect user privacy.</div>
                    </div>
                </section>

                {/* Product previews */}
                <section className="py-12 px-6 bg-white dark:bg-[#0f1319]">
                    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                        <div className="relative col-span-2 overflow-hidden rounded-xl border border-gray-300 dark:border-white/10 shadow-md dark:shadow-none">
                            <Image
                                src="/TradiaCalendar.png"
                                alt="Tradia trading journal calendar showing trade history, performance timeline, and trading patterns visualization"
                                fill
                                className="object-cover"
                                sizes="(min-width: 1024px) 720px, 100vw"
                            />
                        </div>

                        <div className="rounded-xl border border-gray-300 dark:border-white/10 p-6 flex flex-col justify-between bg-gray-50 dark:bg-gray-900/50 shadow-md dark:shadow-none">
                            <div>
                                <h4 className="font-bold text-lg text-gray-900 dark:text-white">Pattern & setup preview</h4>
                                <p className="mt-2 text-gray-600 dark:text-gray-400">Identify repeating patterns and trading with quick filters and tagging.</p>
                            </div>

                            <div className="relative mt-4 overflow-hidden rounded-md border border-gray-300 dark:border-white/10">
                                <Image
                                    src="/TradiaPattern.png"
                                    alt="Tradia trading pattern analysis showing recurring trade setups, entry signals, and performance metrics for pattern-based trading strategies"
                                    fill
                                    className="object-cover"
                                    sizes="(min-width: 1024px) 360px, 100vw"
                                />
                            </div>

                            <div className="mt-4">
                                <button onClick={navSignup} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded font-semibold transition-colors">Get started — see your patterns</button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FAQ + CTA */}
                <section className="py-16 px-6 bg-white dark:bg-black">
                    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Frequently asked questions</h3>

                            <div className="space-y-3">
                                {[
                                    { q: "Is there a free plan?", a: "Yes — Starter is free forever with 30-day trade history, basic analytics, and CSV import. Upgrade anytime to unlock advanced AI features." },
                                    { q: "How does AI help?", a: "AI reviews entry/exit context to give actionable suggestions like sizing changes, stop recommendations and repeatable lessons to improve your trading." },
                                    { q: "Can I change plans anytime?", a: "Yes, upgrade or downgrade anytime. Annual plans get a 20% discount and are billed upfront." },
                                ].map((fq, i) => (
                                    <details key={i} className="p-4 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-900/50">
                                        <summary className="font-medium text-gray-900 dark:text-white cursor-pointer">{fq.q}</summary>
                                        <p className="mt-2 text-gray-700 dark:text-gray-300">{fq.a}</p>
                                    </details>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-xl p-8 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shadow-md dark:shadow-none">
                            <h4 className="text-xl font-bold text-black dark:text-white">Ready to stop guessing and start improving?</h4>
                            <p className="mt-2 text-gray-600 dark:text-gray-300">Create an account and upload your first trade history — get instant insights and AI trade reviews.</p>
                            <div className="mt-6 flex gap-3">
                                <button onClick={navSignup} className="bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black px-4 py-2 rounded-full font-semibold transition-colors">Create free account</button>
                                <Link href="/pricing" className="px-4 py-2 rounded-full border border-black dark:border-white text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">See plans</Link>
                            </div>

                            <div className="mt-6 text-xs text-gray-500 dark:text-gray-400">Need help? <Link href="/contact" className="text-black dark:text-white underline">Contact us</Link>.</div>
                        </div>
                    </div>
                </section>

                <Footer />
            </main>
        </>
    );
}


