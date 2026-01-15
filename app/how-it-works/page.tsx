"use client";

import React from "react";
import { ArrowRight, Upload, Brain, TrendingUp, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function HowItWorksPage() {
  const router = useRouter();

  const steps = [
    {
      number: 1,
      title: "Upload Your Trades",
      description: "Export your trade data from any broker (MT4, MT5, cTrader, etc.) as CSV and upload it to Tradia in seconds.",
      icon: <Upload className="w-8 h-8 text-black dark:text-white" />,
      details: [
        "Supports all major brokers",
        "Instant CSV upload",
        "Secure data encryption",
      ],
    },
    {
      number: 2,
      title: "AI Analyzes Your Performance",
      description: "Our advanced AI engine analyzes your trades and generates detailed performance metrics, risk analysis, and insights.",
      icon: <Brain className="w-8 h-8 text-black dark:text-white" />,
      details: [
        "Win rate calculation",
        "Profit factor analysis",
        "Risk/reward ratios",
        "Drawdown tracking",
      ],
    },
    {
      number: 3,
      title: "Get Personalized Coaching",
      description: "Chat with your AI coach who reviews your trades, explains mistakes, and gives you actionable improvement suggestions.",
      icon: <TrendingUp className="w-8 h-8 text-black dark:text-white" />,
      details: [
        "Daily performance summaries",
        "Strategy feedback",
        "Mistake analysis",
        "Improvement recommendations",
      ],
    },
    {
      number: 4,
      title: "Track & Improve",
      description: "Monitor your progress over time with detailed analytics, journaling tools, and performance reports.",
      icon: <CheckCircle className="w-8 h-8 text-black dark:text-white" />,
      details: [
        "Real-time dashboards",
        "Performance trends",
        "Habit tracking",
        "Progress reports",
      ],
    },
  ];

  const features = [
    {
      title: "Multi-Account Support",
      description: "Manage personal accounts, prop firm accounts, and demo accounts all in one place.",
    },
    {
      title: "Voice Guidance",
      description: "Get trading advice hands-free with voice-enabled AI coaching (Pro+ plans).",
    },
    {
      title: "Image Analysis",
      description: "Upload trade screenshots and get AI insights on chart patterns and setups (Plus+ plans).",
    },
    {
      title: "Smart Journaling",
      description: "Record lessons learned, track psychology, and build better trading habits.",
    },
    {
      title: "Risk Management Tools",
      description: "Position sizing calculator, daily loss alerts, and drawdown warnings.",
    },
    {
      title: "Export & Share",
      description: "Generate PDF/Excel reports and share analysis with mentors (Pro+ plans).",
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#0D1117]">
      {/* Hero Section */}
      <div className="relative bg-white dark:bg-[#0D1117] py-16 px-4 sm:px-6 lg:px-8 border-b border-gray-100 dark:border-white/5">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 text-center">
            How Tradia Works
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 text-center max-w-3xl mx-auto">
            Transform your trading in 4 simple steps. From trade upload to AI coaching to measurable improvement.
          </p>
        </div>
      </div>

      {/* Steps Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-12">
          {steps.map((step, index) => (
            <div key={index} className="grid md:grid-cols-2 gap-8 items-center">
              <div className={index % 2 === 0 ? "md:order-1" : "md:order-2"}>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-16 w-16 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                      {step.icon}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {step.title}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {step.description}
                    </p>
                    <ul className="space-y-2">
                      {step.details.map((detail, i) => (
                        <li key={i} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                          <CheckCircle className="w-4 h-4 text-black dark:text-white" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              <div className={`bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl h-64 flex items-center justify-center text-black dark:text-white text-center ${index % 2 === 0 ? "md:order-2" : "md:order-1"}`}>
                <div className="p-8">
                  <div className="text-6xl font-bold opacity-20 mb-4">{step.number}</div>
                  <p className="text-lg font-semibold">{step.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-gray-50 dark:bg-[#0f1319] py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 text-center">
            Powerful Features at Every Step
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            Everything you need to understand, analyze, and improve your trading performance.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white dark:bg-[#0F1623] rounded-lg p-6 border border-gray-200 dark:border-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-black dark:bg-white/5 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Start Improving Your Trading?
          </h2>
          <p className="text-gray-400 mb-8 text-lg">
            Upload your first trades and get AI analysis in minutes. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-black hover:bg-gray-200"
              onClick={() => router.push("/signup")}
            >
              Get Started Free <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => router.push("/pricing")}
            >
              View Plans
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
