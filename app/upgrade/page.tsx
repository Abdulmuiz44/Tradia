"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Crown, ArrowRight, Zap, TrendingUp, Shield, Loader2 } from "lucide-react";
import { getPlanDisplayName, PlanType } from "@/lib/planAccess";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getCheckoutUrl } from "@/lib/checkout-urls";

interface PlanOption {
  type: PlanType;
  name: string;
  price: number;
  yearlyPrice: number;
  features: string[];
  badge?: string;
  icon: React.ReactNode;
}

const PLANS: PlanOption[] = [
  {
    type: "starter",
    name: "Starter",
    price: 0,
    yearlyPrice: 0,
    badge: "Current Plan",
    icon: <Shield className="w-6 h-6" />,
    features: [
      "30 days trade history",
      "Basic analytics",
      "CSV trade import",
      "Core features",
    ],
  },
  {
    type: "pro",
    name: "Pro",
    price: 9,
    yearlyPrice: 90,
    icon: <TrendingUp className="w-6 h-6" />,
    features: [
      "6 months trade history",
      "AI weekly summary",
      "Personalized strategy recommendations",
      "Risk management & market timing insights",
      "Advanced analytics",
    ],
  },
  {
    type: "plus",
    name: "Plus",
    price: 19,
    yearlyPrice: 190,
    badge: "Most Popular",
    icon: <Zap className="w-6 h-6" />,
    features: [
      "Unlimited trade history",
      "AI trade reviews & SL/TP suggestions",
      "Image processing for trade screenshots",
      "Real-time performance analytics",
      "All Pro features",
    ],
  },
  {
    type: "elite",
    name: "Elite",
    price: 39,
    yearlyPrice: 390,
    icon: <Crown className="w-6 h-6" />,
    features: [
      "Everything in Plus",
      "AI strategy builder",
      "Prop-firm dashboard",
      "All AI features included",
      "Priority support",
    ],
  },
];

const PLAN_ORDER = ["starter", "pro", "plus", "elite"];

export default function UpgradePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [currentPlan, setCurrentPlan] = useState<PlanType>("starter");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  // Check auth status first
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?redirect=/upgrade");
    }
  }, [status, router]);

  // Fetch current plan
  useEffect(() => {
    const fetchCurrentPlan = async () => {
      if (!session?.user?.id) return;

      try {
        const res = await fetch("/api/user/plan");
        if (res.ok) {
          const data = await res.json();
          setCurrentPlan(data.plan || "starter");
        }
      } catch (error) {
        console.error("Failed to fetch current plan:", error);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user && status === "authenticated") {
      fetchCurrentPlan();
    }
  }, [session?.user, status]);

  if (status === "loading" || loading) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#0f1319]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-black dark:text-white" />
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const currentPlanIndex = PLAN_ORDER.indexOf(currentPlan as string);
  const upgradeablePlans = PLANS.filter((plan) => {
    const planIndex = PLAN_ORDER.indexOf(plan.type);
    return planIndex > currentPlanIndex;
  });

  const handleUpgrade = (planType: PlanType) => {
    const checkoutUrl = getCheckoutUrl(planType as "pro" | "plus" | "elite", billingCycle as "monthly" | "yearly");
    window.location.href = checkoutUrl;
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white dark:bg-[#0f1319] text-gray-900 dark:text-gray-100 transition-colors">
        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-black dark:text-white">
              Choose Your Plan
            </h1>
            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              You&apos;re currently on the{" "}
              <span className="font-semibold text-black dark:text-white">
                {getPlanDisplayName(currentPlan)}
              </span>{" "}
              plan. Unlock more advanced features and trading insights.
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="mb-12 flex justify-center">
            <div className="inline-flex rounded-full bg-gray-200 dark:bg-gray-800 p-1 border border-gray-300 dark:border-gray-700">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-6 py-2 rounded-full font-semibold transition-all ${billingCycle === "monthly"
                  ? "bg-white dark:bg-white text-black shadow-lg"
                  : "text-gray-700 dark:text-gray-300"
                  }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-6 py-2 rounded-full font-semibold transition-all ${billingCycle === "yearly"
                  ? "bg-white dark:bg-white text-black shadow-lg"
                  : "text-gray-700 dark:text-gray-300"
                  }`}
              >
                Yearly (Save 20%)
              </button>
            </div>
          </div>

          {/* Plans Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {PLANS.map((plan, index) => {
              const isCurrentPlan = plan.type === currentPlan;
              const canUpgrade = PLAN_ORDER.indexOf(plan.type) > currentPlanIndex;

              return (
                <motion.div
                  key={plan.type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative rounded-2xl border-2 transition-all duration-300 overflow-hidden ${plan.badge === "Most Popular"
                    ? "border-black dark:border-white bg-gray-50 dark:bg-gray-900 shadow-2xl scale-105"
                    : isCurrentPlan
                      ? "border-gray-400 dark:border-gray-500 bg-gray-100 dark:bg-gray-800"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f1319]/50 hover:border-gray-400 dark:hover:border-gray-500"
                    }`}
                >
                  {/* Badge */}
                  {plan.badge && !isCurrentPlan && (
                    <div className="absolute top-4 right-4">
                      <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-black dark:bg-white text-white dark:text-black">
                        {plan.badge}
                      </span>
                    </div>
                  )}
                  {isCurrentPlan && (
                    <div className="absolute top-4 right-4">
                      <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-gray-600 text-white">
                        Current Plan
                      </span>
                    </div>
                  )}

                  <div className="p-8">
                    {/* Icon & Name */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-black dark:text-white">
                        {plan.icon}
                      </div>
                      <h3 className="text-2xl font-bold text-black dark:text-white">{plan.name}</h3>
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-black dark:text-white">
                          {plan.price === 0 ? "Free" : `$${billingCycle === "monthly" ? plan.price : plan.yearlyPrice}`}
                        </span>
                        {plan.price > 0 && (
                          <span className="text-gray-500 dark:text-gray-400">
                            /{billingCycle === "monthly" ? "mo" : "yr"}
                          </span>
                        )}
                      </div>
                      {billingCycle === "yearly" && plan.price > 0 && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Save ${Math.round(plan.price * 12 * 0.2)}/year
                        </p>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <svg
                            className="w-5 h-5 text-black dark:text-white flex-shrink-0 mt-0.5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    {canUpgrade ? (
                      <button
                        onClick={() => handleUpgrade(plan.type)}
                        disabled={upgrading}
                        className={`w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${plan.badge === "Most Popular"
                          ? "bg-white text-black hover:bg-gray-100 border-2 border-black shadow-lg"
                          : "bg-gray-100 dark:bg-gray-700 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {upgrading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            Upgrade to {plan.name}
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    ) : isCurrentPlan ? (
                      <button
                        disabled
                        className="w-full py-3 px-4 rounded-lg font-semibold bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                      >
                        Current Plan
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full py-3 px-4 rounded-lg font-semibold bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-500 cursor-not-allowed"
                      >
                        Included
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* FAQ Section */}
          <div className="mt-16 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-8 text-center text-black dark:text-white">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: "Can I change my plan anytime?",
                  a: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.",
                },
                {
                  q: "What happens when I upgrade?",
                  a: "When you upgrade, you'll gain immediate access to all the features of your new plan. You'll be billed the difference on your next billing cycle.",
                },
                {
                  q: "Is there a contract or commitment?",
                  a: "No, there's no long-term contract. You can cancel your subscription or change plans at any time.",
                },
                {
                  q: "Do you offer refunds?",
                  a: "We offer a full refund within 7 days of purchase if you're not satisfied. After that, no refunds are issued, but you can downgrade instead.",
                },
              ].map((item, index) => (
                <details
                  key={index}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-colors bg-white dark:bg-gray-900"
                >
                  <summary className="font-semibold cursor-pointer flex items-center justify-between text-black dark:text-white">
                    {item.q}
                    <span className="ml-4 flex-shrink-0">
                      <svg
                        className="w-5 h-5 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </span>
                  </summary>
                  <p className="mt-3 text-gray-600 dark:text-gray-400">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
