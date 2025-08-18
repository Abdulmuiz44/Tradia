// src/components/payment/PricingPlans.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import { CheckCircle, X, Star } from "lucide-react";
import { motion } from "framer-motion";

type BillingType = "monthly" | "yearly";
type PlanName = "free" | "plus" | "pro" | "elite";

type Plan = {
  name: PlanName;
  label: string;
  priceMonthly: number;
  priceYearly?: number;
  tagline?: string;
  features: string[];
  highlight?: boolean;
};

const basePlans: Plan[] = [
  {
    name: "free",
    label: "Free",
    priceMonthly: 0,
    priceYearly: 0,
    tagline: "Forever free — get started",
    features: [
      "User Dashboard & Account Sync",
      "Performance Metrics Engine",
      "Interactive Analytics (Plotly)",
      "Risk Metrics (basic)",
      "AI Summaries — weekly",
      "Trade Journaling (manual + auto)",
      "Export: CSV / PDF (limited)",
    ],
  },
  {
    name: "plus",
    label: "Plus",
    priceMonthly: 9,
    priceYearly: 90,
    tagline: "Daily analysis & faster improvement",
    features: [
      "Unlimited charts & saved views",
      "Daily AI insights & trade tips",
      "Advanced filters & exports",
      "Behavioral & pattern analytics",
      "Smart timeline, calendar view",
    ],
    highlight: true,
  },
  {
    name: "pro",
    label: "Pro",
    priceMonthly: 19,
    priceYearly: 190,
    tagline: "For serious, scaling traders",
    features: [
      "Everything in Plus",
      "AI forecasting & pattern prediction",
      "SL/TP Optimization engine",
      "Risk metrics: drawdown, VaR, sharpe",
      "Strategy tagging & success tracking",
      "Prop-firm & milestone tracker",
    ],
  },
  {
    name: "elite",
    label: "Elite",
    priceMonthly: 39,
    priceYearly: 390,
    tagline: "White-glove coaching & enterprise",
    features: [
      "Everything in Pro",
      "Custom AI coaching sessions",
      "Private strategy repository",
      "Priority support & onboarding",
      "Custom integrations & prop firm mentoring",
    ],
  },
];

// Merge cumulative features so higher tiers show everything below them
const mergeFeatures = (plans: Plan[]) => {
  const merged: Plan[] = [];
  let accumulated: string[] = [];

  for (const plan of plans) {
    accumulated = Array.from(new Set([...accumulated, ...plan.features]));
    merged.push({ ...plan, features: [...accumulated] });
  }

  return merged;
};

const plans: Plan[] = mergeFeatures(basePlans);

// testimonials with escaped apostrophes / smart quotes to satisfy eslint rule
const testimonials: { name: string; quote: string }[] = [
  {
    name: "Aisha • FX Trader",
    quote:
      "Tradia&rsquo;s daily AI review pointed out a recurring mistake in my entries — I corrected it and improved my win-rate by 12% in two weeks.",
  },
  {
    name: "Tom • Prop-firm Candidate",
    quote:
      "The SL/TP optimizer and simulated run cut my drawdown in half during my prep for evaluation.",
  },
  {
    name: "Len • Swing Trader",
    quote:
      "Auto-sync with MT5 and the weekly recap saved me hours every week. Better trades, less busywork.",
  },
];

const getDisplayPrice = (p: Plan, billing: BillingType): number =>
  billing === "monthly" ? p.priceMonthly : typeof p.priceYearly === "number" ? p.priceYearly : Math.round(p.priceMonthly * 10);

const getAnnualSavings = (p: Plan): number => {
  const monthly = p.priceMonthly;
  const yearly = typeof p.priceYearly === "number" ? p.priceYearly : monthly * 10;
  const saved = Math.round(monthly * 12 - yearly);
  return saved > 0 ? saved : 0;
};

const PricingPlans: React.FC = () => {
  const { plan, setPlan } = useUser();
  const [billingType, setBillingType] = useState<BillingType>("monthly");
  const router = useRouter();

  useEffect(() => {
    if (!plan) {
      setPlan("free");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpgrade = (selectedPlan: PlanName) => {
    // setPlan expects a string in UserContext; PlanName is a string subtype so this is safe
    setPlan(selectedPlan);
    const trialDays = selectedPlan === "free" ? 0 : 3;
    router.push(`/checkout?plan=${selectedPlan}&billing=${billingType}&trial=${trialDays}`);
  };

  return (
    <div className="p-6 md:p-10 min-h-screen bg-gradient-to-br from-[#0f111a] via-[#111827] to-[#0c1118] text-white">
      {/* HERO */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">
              Trade smarter. <span className="text-blue-400">Grow faster.</span>
            </h1>
            <p className="mt-3 text-gray-300 max-w-2xl">
              Tradia is your AI trading coach — automatically analyze trades, find leaks, and receive daily, actionable insights that help you preserve capital and improve returns.
            </p>

            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={() => handleUpgrade("plus")}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                aria-label="Start Plus free trial"
              >
                Start Plus — 3-Day Trial
              </button>

              <button
                onClick={() => handleUpgrade("free")}
                className="bg-transparent border border-gray-700 text-gray-200 py-2 px-4 rounded-lg font-medium hover:border-blue-600 transition"
              >
                Start Free — Always Free
              </button>

              <span className="ml-4 inline-flex items-center text-sm text-gray-400 gap-2">
                <Star className="w-4 h-4 text-yellow-400" /> Most traders pick{" "}
                <strong className="text-white ml-1">Plus</strong>
              </span>
            </div>
          </div>

          {/* Billing toggle */}
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-400">Billed Monthly</div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only"
                checked={billingType === "yearly"}
                onChange={() => setBillingType((prev) => (prev === "monthly" ? "yearly" : "monthly"))}
                aria-label="Toggle billing frequency"
              />
              <span className={`w-14 h-7 block rounded-full transition-all ${billingType === "yearly" ? "bg-blue-600" : "bg-gray-600"}`} />
              <span
                className={`absolute left-1 top-1 w-5 h-5 bg-white rounded-full shadow transform transition-transform ${billingType === "yearly" ? "translate-x-7" : "translate-x-0"}`}
              />
            </label>
            <div className="text-sm text-gray-400">Billed Yearly</div>
          </div>
        </div>
      </div>

      {/* PRICING CARDS */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 gap-6 lg:grid-cols-4">
        {plans.map((p) => {
          const isSelected = plan === p.name;
          const displayPrice = getDisplayPrice(p, billingType);

          return (
            <motion.div
              key={p.name}
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 220 }}
              className={`rounded-2xl p-5 flex flex-col justify-between border ${p.highlight ? "border-blue-500 bg-[#0f1724]/70 shadow-2xl" : "border-gray-700 bg-[#0b1220]/60"}`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold">{p.label}</h3>
                    <p className="text-sm text-gray-400">{p.tagline}</p>
                  </div>

                  {p.highlight && (
                    <div className="text-xs px-2 py-1 bg-gradient-to-r from-purple-600 to-blue-500 rounded-md font-semibold text-white">
                      Most Popular
                    </div>
                  )}
                </div>

                <div className="mt-5 flex items-baseline gap-3">
                  <span className="text-3xl md:text-4xl font-extrabold">{displayPrice === 0 ? "$0" : `$${displayPrice}`}</span>
                  <span className="text-sm text-gray-400">/{billingType === "monthly" ? "mo" : "yr"}</span>
                </div>

                <div className="mt-1 text-sm text-green-300">
                  {billingType === "yearly" && getAnnualSavings(p) > 0 && <span>Save ${getAnnualSavings(p)} with yearly billing</span>}
                </div>

                <ul className="mt-5 space-y-2 text-gray-200 text-sm">
                  {p.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {isSelected && <div className="mt-4 inline-block text-sm font-semibold text-blue-300">✓ Currently Selected</div>}
              </div>

              <div className="mt-6">
                <button
                  onClick={() => handleUpgrade(p.name)}
                  className={`w-full py-2 rounded-lg font-semibold transition ${p.name === "free" ? "bg-transparent border border-gray-600 text-gray-200 hover:border-blue-500" : p.highlight ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-800 hover:bg-gray-700 text-white"}`}
                >
                  {p.name === "free" ? "Continue with Free" : `Start ${p.label}`}
                  {p.name !== "free" && <span className="text-xs ml-2">3-day trial</span>}
                </button>

                <div className="mt-3 text-xs text-gray-400">
                  {p.name !== "free" ? <span>Cancel anytime during trial. Annual billed plans have 2 months free.</span> : <span>Your account starts with the Free plan — upgrade anytime.</span>}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* COMPARISON TABLE */}
      <div className="max-w-6xl mx-auto mt-12 bg-[#071024]/60 rounded-2xl p-6 border border-gray-800">
        <h4 className="text-xl font-bold mb-4">Compare plans</h4>

        <div className="overflow-x-auto">
          <table className="w-full table-auto text-sm text-left">
            <thead>
              <tr>
                <th className="py-2 px-3 text-gray-400">Feature</th>
                {plans.map((p) => (
                  <th key={p.name} className="py-2 px-3 text-gray-300 text-center">{p.label}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {Array.from(new Set(plans.flatMap((p) => p.features))).map((feature) => (
                <tr key={feature} className="border-t border-gray-800">
                  <td className="py-3 px-3 text-gray-300 max-w-sm">{feature}</td>
                  {plans.map((p) => {
                    const included = p.features.includes(feature);
                    return (
                      <td key={p.name + feature} className="py-3 px-3 text-center">
                        {included ? <CheckCircle className="w-4 h-4 inline-block text-green-400" /> : <X className="w-4 h-4 inline-block text-red-500" />}
                      </td>
                    );
                  })}
                </tr>
              ))}

              <tr className="border-t border-gray-800">
                <td className="py-3 px-3 text-gray-300">AI Forecasting</td>
                {plans.map((p) => (
                  <td key={p.name + "forecast"} className="py-3 px-3 text-center">
                    {["pro", "elite"].includes(p.name) ? <CheckCircle className="w-4 h-4 inline-block text-green-400" /> : <X className="w-4 h-4 inline-block text-red-500" />}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-400 max-w-2xl">
            <strong>Pro tip:</strong> Start free, upgrade to Plus to get daily AI coaching. Move to Pro once you're consistently profitable and want automated SL/TP optimization.
          </div>

          <div className="flex gap-3">
            <button onClick={() => handleUpgrade("plus")} className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-semibold">
              Start Plus Trial
            </button>
            <button onClick={() => handleUpgrade("pro")} className="bg-transparent border border-gray-700 text-gray-200 py-2 px-4 rounded-lg">
              Talk to Sales (Elite)
            </button>
          </div>
        </div>
      </div>

      {/* TESTIMONIALS */}
      <div className="max-w-6xl mx-auto mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
        {testimonials.map((t, i) => (
          <div key={i} className="bg-[#071026]/50 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-200">&ldquo;{t.quote}&rdquo;</p>
            <div className="mt-3 text-sm text-gray-400 font-semibold">{t.name}</div>
          </div>
        ))}
      </div>

      {/* GUARANTEE / FAQ */}
      <div className="max-w-6xl mx-auto mt-8 p-6 bg-[#061226]/60 rounded-2xl border border-gray-800">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h5 className="text-lg font-bold">Risk-free trial & guarantee</h5>
            <p className="text-gray-400 mt-2">
              Start Plus or Pro with a 3-day free trial. Cancel within the trial — no charges. We are confident Tradia will reveal meaningful insights in the first 7 days.
            </p>
          </div>

          <div className="text-sm text-gray-300">
            <div className="font-semibold">Need help?</div>
            <div className="text-gray-400">Email: support@tradia.app • Live chat inside the app</div>
          </div>
        </div>
      </div>

      {/* tiny FAQ */}
      <div className="max-w-6xl mx-auto mt-6 text-sm text-gray-400">
        <details className="mb-2">
          <summary className="cursor-pointer font-semibold">How does the 3-day trial work?</summary>
          <div className="mt-2 text-gray-300">
            You can explore Plus/Pro features during the trial. Cancel anytime in the trial period to avoid billing.
          </div>
        </details>

        <details>
          <summary className="cursor-pointer font-semibold">Can I switch plans later?</summary>
          <div className="mt-2 text-gray-300">
            Yes — upgrade or downgrade anytime. Annual plans are billed up-front and prorates/credits may apply.
          </div>
        </details>
      </div>
    </div>
  );
};

export default PricingPlans;
