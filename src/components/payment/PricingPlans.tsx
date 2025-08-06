"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

const basePlans = [
  {
    name: "free",
    label: "Free",
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      "User Dashboard & Account Sync",
      "Performance Metrics Engine",
      "Interactive Analytics (Plotly)",
      "Risk Metrics",
      "AI-Powered Insights",
      "Trade Journaling System",
      "Export & Reporting Tools",
    ],
  },
  {
    name: "plus",
    label: "Plus",
    priceMonthly: 19,
    priceYearly: 190,
    features: [
      "Behavioral & Pattern Analytics",
      "Smart Timeline & Calendar View",
      "Strategy Tagging & Success Tracking",
      "AI-Powered Suggestions",
    ],
  },
  {
    name: "premium",
    label: "Premium",
    priceMonthly: 39,
    priceYearly: 390,
    features: [
      "Smart Trade Reviews",
      "SL/TP Optimization Engine",
      "AI Forecasting & Pattern Prediction",
      "Trade Lifecycle & Recap Generator",
      "Voice & Screenshot Journaling",
      "Prop Firm & Milestone Tracker",
    ],
  },
  {
    name: "pro",
    label: "Pro",
    priceMonthly: 79,
    priceYearly: 790,
    features: [
      "What-if Strategy Simulator",
      "Auto Strategy Clustering",
      "Anomaly Detection & Heatmaps",
      "AI Strategy Builder",
      "Multi-Account Portfolio View",
      "Mobile Companion & Chat Assistant",
      "Goal Tracking with Gamification",
      "Missed Opportunity Tracker",
    ],
  },
];

// Merge inherited features
const mergeFeatures = () => {
  const merged: typeof basePlans = [];
  let inherited: string[] = [];

  for (const plan of basePlans) {
    inherited = [...inherited, ...plan.features];
    merged.push({ ...plan, features: [...inherited] });
  }

  return merged;
};

const plans = mergeFeatures();

const PricingPlans = () => {
  const { plan, setPlan } = useUser();
  const [billingType, setBillingType] = useState<"monthly" | "yearly">("monthly");
  const router = useRouter();

  useEffect(() => {
    if (!plan) setPlan("free");
  }, [plan, setPlan]);

  const handleUpgrade = (selectedPlan: string) => {
    setPlan(selectedPlan as any);
    router.push(`/checkout?plan=${selectedPlan}&billing=${billingType}`);
  };

  return (
    <div className="p-6 md:p-10 min-h-screen bg-gradient-to-br from-[#0f111a] via-[#111827] to-[#0c1118] text-white text-sm">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold">Choose Your Plan</h2>

        <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold">
          <span className="text-gray-400">Monthly</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={billingType === "yearly"}
              onChange={() =>
                setBillingType(billingType === "monthly" ? "yearly" : "monthly")
              }
            />
            <div className="w-11 h-6 bg-gray-600 rounded-full peer-checked:bg-blue-600 transition-all relative">
              <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
            </div>
          </label>
          <span className="text-gray-400">Yearly</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((p) => {
          const isSelected = plan === p.name;
          const price = billingType === "monthly" ? p.priceMonthly : p.priceYearly;

          return (
            <motion.div
              key={p.name}
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 250 }}
              className={`rounded-2xl p-6 border flex flex-col justify-between transition-all
                ${
                  isSelected
                    ? "border-blue-500 bg-[#17203b]/60 shadow-xl"
                    : "border-gray-700 bg-[#1a1f2f] hover:border-blue-600"
                }`}
            >
              <div onClick={() => setPlan(p.name as any)} className="cursor-pointer">
                <h3 className="text-xl font-bold mb-2">{p.label}</h3>
                <p className="text-4xl font-extrabold mb-4 text-white">
                  ${price}
                  <span className="text-base font-medium text-gray-400 ml-1">
                    /{billingType}
                  </span>
                </p>

                <ul className="space-y-2 text-sm text-gray-300 font-medium">
                  {p.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="text-green-400 w-4 h-4 mt-1" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <p className="text-xs text-gray-400 mt-4">
                  You will get everything in the previous plan plus the features of this
                  plan.
                </p>

                {isSelected && (
                  <div className="mt-4 text-sm font-semibold text-blue-400">
                    ✓ Currently Selected
                  </div>
                )}
              </div>

              {p.name !== "free" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpgrade(p.name);
                  }}
                  className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all"
                >
                  Upgrade to {p.label}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default PricingPlans;
