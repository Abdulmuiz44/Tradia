"use client";

import React from "react";
import { BookOpen, Video, Lightbulb, Users, FileText, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function ResourcesPage() {
  const router = useRouter();

  const resources = [
    {
      category: "Getting Started",
      icon: <BookOpen className="w-6 h-6" />,
      items: [
        {
          title: "Quick Start Guide",
          description: "Learn how to set up your account and upload your first trades.",
          link: "/how-it-works",
        },
        {
          title: "Broker Integration Guide",
          description: "Step-by-step instructions for importing trades from your broker.",
          link: "#",
        },
        {
          title: "First Trade Analysis",
          description: "Understand how to interpret Tradia's performance metrics.",
          link: "#",
        },
      ],
    },
    {
      category: "Trading Journal Tips",
      icon: <FileText className="w-6 h-6" />,
      items: [
        {
          title: "How to Keep an Effective Trade Journal",
          description: "Best practices for recording lessons and tracking your progress.",
          link: "#",
        },
        {
          title: "Analyzing Your Mistakes",
          description: "Learn from losses and prevent them from happening again.",
          link: "#",
        },
        {
          title: "Tagging & Organization",
          description: "Master trade tagging to identify patterns and strategies.",
          link: "#",
        },
      ],
    },
    {
      category: "Performance Analysis",
      icon: <Lightbulb className="w-6 h-6" />,
      items: [
        {
          title: "Understanding Key Metrics",
          description: "Win rate, profit factor, risk/reward—what they mean and why they matter.",
          link: "#",
        },
        {
          title: "Interpreting Your Equity Curve",
          description: "Read your equity curve to identify drawdowns and recovery patterns.",
          link: "#",
        },
        {
          title: "Strategy Evaluation",
          description: "How to tell if a strategy is actually profitable.",
          link: "#",
        },
      ],
    },
    {
      category: "AI Coaching",
      icon: <Users className="w-6 h-6" />,
      items: [
        {
          title: "Using the AI Coach",
          description: "Get the most out of your AI trading coach with smart questions.",
          link: "#",
        },
        {
          title: "Chat Modes Explained",
          description: "Understand Assistant, Coach, Mentor, Analyst, and Strategist modes.",
          link: "#",
        },
        {
          title: "Voice Guidance Tips",
          description: "Use voice mode for hands-free trading advice.",
          link: "#",
        },
      ],
    },
    {
      category: "Advanced Features",
      icon: <Video className="w-6 h-6" />,
      items: [
        {
          title: "Multi-Account Management",
          description: "Manage multiple trading accounts with separate analytics.",
          link: "#",
        },
        {
          title: "Risk Management Tools",
          description: "Use position sizing and daily loss alerts to protect your account.",
          link: "#",
        },
        {
          title: "Image Analysis for Trades",
          description: "Upload trade screenshots and get AI insights (Plus+ plans).",
          link: "#",
        },
      ],
    },
    {
      category: "Community & Support",
      icon: <MessageSquare className="w-6 h-6" />,
      items: [
        {
          title: "FAQ",
          description: "Answers to common questions about Tradia and your trading.",
          link: "#",
        },
        {
          title: "Contact Support",
          description: "Reach out to our support team for help.",
          link: "/contact",
        },
        {
          title: "Feature Requests",
          description: "Suggest new features and help shape Tradia's future.",
          link: "#",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#0D1117]">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-[#0D1117] py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 text-center">
            Learning Resources
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 text-center max-w-3xl mx-auto">
            Everything you need to master Tradia and improve your trading performance.
          </p>
        </div>
      </div>

      {/* Resources Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 gap-8">
          {resources.map((resourceCategory, index) => (
            <div
              key={index}
              className="bg-white dark:bg-[#0F1623] rounded-lg border border-gray-200 dark:border-gray-800 p-6 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="text-blue-600 dark:text-blue-400">
                  {resourceCategory.icon}
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {resourceCategory.category}
                </h2>
              </div>
              <div className="space-y-4">
                {resourceCategory.items.map((item, itemIndex) => (
                  <button
                    key={itemIndex}
                    onClick={() => item.link !== "#" && router.push(item.link)}
                    className="w-full text-left p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {item.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tips Section */}
      <div className="bg-blue-50 dark:bg-gray-900 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Pro Tips for Trading Success
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: "Review Trades Weekly",
                desc: "Set aside time each week to analyze your trades and journal lessons learned.",
              },
              {
                title: "Use AI Feedback",
                desc: "Ask your AI coach specific questions about trades that confused you.",
              },
              {
                title: "Track Your Metrics",
                desc: "Monitor win rate, profit factor, and risk/reward weekly to spot trends.",
              },
              {
                title: "Build Accountability",
                desc: "Use shared reports to discuss your trading with mentors or accountability partners.",
              },
              {
                title: "Experiment Methodically",
                desc: "Test strategy changes one at a time and track results in your journal.",
              },
              {
                title: "Focus on Process",
                desc: "Improve your process, and profits will follow. Track behavior, not just results.",
              },
            ].map((tip, index) => (
              <div key={index} className="bg-white dark:bg-[#0F1623] p-6 rounded-lg">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {tip.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {tip.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-900 dark:to-purple-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Need More Help?
          </h2>
          <p className="text-blue-100 mb-8 text-lg">
            Our support team is here to help you succeed with Tradia.
          </p>
          <Button
            size="lg"
            className="bg-white text-blue-600 hover:bg-blue-50"
            onClick={() => router.push("/contact")}
          >
            Contact Support
          </Button>
        </div>
      </div>
    </div>
  );
}
