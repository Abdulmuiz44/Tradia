"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AiOutlineCheck } from "react-icons/ai";
import toast from "react-hot-toast";

/**
 * Onboarding page for new traders
 * Collects market preference: Forex, Crypto, or Both
 */

type MarketType = "forex" | "crypto" | "both";

interface MarketOption {
  id: MarketType;
  title: string;
  description: string;
  examples: string;
  icon: string;
}

const MARKET_OPTIONS: MarketOption[] = [
  {
    id: "forex",
    title: "Forex (FX)",
    description: "Trade currency pairs in the foreign exchange market",
    examples: "EUR/USD, GBP/JPY, USD/JPY, etc.",
    icon: "💱",
  },
  {
    id: "crypto",
    title: "Cryptocurrency",
    description: "Trade digital assets and cryptocurrencies",
    examples: "BTC/USDT, ETH/USDT, SOL/USDT, etc.",
    icon: "₿",
  },
  {
    id: "both",
    title: "Both FX & Crypto",
    description: "Trade both Forex pairs and cryptocurrencies",
    examples: "All currency pairs and crypto assets",
    icon: "🌐",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedMarket, setSelectedMarket] = useState<MarketType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedMarket) {
      toast.error("Please select your trading market");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          market_preference: selectedMarket,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save market preference");
      }

      toast.success("Market preference saved!");
      // TODO: Navigate to dashboard or next onboarding step
      router.push("/dashboard");
    } catch (error) {
      console.error("Error saving market preference:", error);
      toast.error("Failed to save preference. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold mb-4">Welcome to Tradia! 🎉</h1>
          <p className="text-gray-300 text-lg">
            Let&apos;s personalize your experience. What do you trade?
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {MARKET_OPTIONS.map((option, index) => (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              onClick={() => setSelectedMarket(option.id)}
              className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all ${
                selectedMarket === option.id
                  ? "border-indigo-500 bg-indigo-500/10 shadow-lg"
                  : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
              }`}
            >
              {selectedMarket === option.id && (
                <div className="absolute top-4 right-4">
                  <div className="bg-indigo-500 rounded-full p-1">
                    <AiOutlineCheck className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}

              <div className="text-4xl mb-4">{option.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{option.title}</h3>
              <p className="text-gray-400 text-sm mb-3">{option.description}</p>
              <p className="text-gray-500 text-xs italic">{option.examples}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center gap-4"
        >
          <button
            onClick={() => router.back()}
            className="px-6 py-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedMarket || isSubmitting}
            className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
              selectedMarket && !isSubmitting
                ? "bg-indigo-500 hover:bg-indigo-600 text-white"
                : "bg-gray-700 text-gray-400 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? "Saving..." : "Continue"}
          </button>
        </motion.div>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Don&apos;t worry, you can change this later in your account settings.
          </p>
        </div>
      </div>
    </div>
  );
}
