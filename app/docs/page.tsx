"use client";

import React, { useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function DocsPage() {
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const documentation = [
    {
      id: "performance",
      title: "Performance Analytics",
      description: "Understanding your trading metrics and statistics",
      subsections: [
        {
          title: "Key Metrics Explained",
          content: `
            • Win Rate: Percentage of trades that are profitable
            • Profit Factor: Gross profit divided by gross loss
            • Risk/Reward Ratio: Average winning trade size vs average losing trade size
            • Expectancy: Average profit/loss per trade in currency
            • Drawdown: Largest peak-to-trough decline
            • Recovery Factor: Net profit divided by maximum drawdown
          `,
        },
        {
          title: "Performance by Strategy",
          content: `
            Filter your trades by strategy to see which setups are actually profitable.
            Compare win rates, profit factors, and risk/reward across different strategies.
            Identify which strategies to focus on and which to improve.
          `,
        },
        {
          title: "Performance by Symbol",
          content: `
            Analyze how you trade different currency pairs or instruments.
            Identify symbols where you consistently profit vs where you struggle.
            Adjust your trading plan based on symbol-specific performance.
          `,
        },
      ],
    },
    {
      id: "chat",
      title: "AI Coach & Chat",
      description: "Getting the most from your AI trading coach",
      subsections: [
        {
          title: "Chat Modes",
          content: `
            • Assistant: General questions about your trades
            • Coach: Personalized feedback and improvement tips
            • Mentor: Strategic guidance and trade review
            • Analyst: Deep technical analysis and statistics
            • Strategist: Strategy development and optimization (Elite only)
          `,
        },
        {
          title: "Asking Effective Questions",
          content: `
            1. Be specific: "Why did I lose on the EUR/USD trade on Monday?"
            2. Provide context: Include strategy, timeframe, and market conditions
            3. Ask for solutions: "What could I have done differently?"
            4. Seek patterns: "Do I lose money on breakout trades?"
          `,
        },
        {
          title: "Voice Input (Pro+ Plans)",
          content: `
            Use voice mode for hands-free trading guidance.
            Great for reviewing trades while you're at your desk.
            Activate voice input in chat settings.
          `,
        },
        {
          title: "Image Analysis (Plus+ Plans)",
          content: `
            Upload trade screenshots and get AI insights.
            Get feedback on chart patterns, entry/exit points, and risk management.
            Perfect for trade reviews during market hours.
          `,
        },
      ],
    },
    {
      id: "journal",
      title: "Trade Journal",
      description: "Recording and learning from your trades",
      subsections: [
        {
          title: "Recording Trades",
          content: `
            Add trades manually or import from your broker via CSV.
            Include entry price, exit price, profit/loss, and strategy.
            Add detailed notes about your decision-making process.
          `,
        },
        {
          title: "Tagging Your Trades",
          content: `
            Tag trades by:
            • Strategy (Breakout, Support/Resistance, Momentum, etc.)
            • Market Condition (Trending, Ranging, Volatile, etc.)
            • Psychology (Disciplined, Revenge Trading, FOMO, etc.)
            • Time of Day (Morning, Afternoon, Evening, etc.)
            
            Use tags to identify patterns and improve specific areas.
          `,
        },
        {
          title: "Lessons & Notes",
          content: `
            Write detailed notes for every trade covering:
            • Why you entered the trade
            • Your initial stop loss and target
            • What happened during the trade
            • What you learned (good or bad)
            • What you'll do differently next time
          `,
        },
      ],
    },
    {
      id: "accounts",
      title: "Multi-Account Management",
      description: "Managing multiple trading accounts",
      subsections: [
        {
          title: "Creating Accounts",
          content: `
            Create separate accounts for:
            • Personal trading (your own capital)
            • Prop firm accounts (funded accounts)
            • Demo/practice accounts (learning)
            • Paper trading accounts (testing strategies)
            
            Each account has separate performance tracking and analytics.
          `,
        },
        {
          title: "Account Limits",
          content: `
            Starter: 2 accounts
            Pro: 5 accounts
            Plus: 10 accounts
            Elite: Unlimited accounts
            
            Upgrade your plan to manage more accounts.
          `,
        },
        {
          title: "Account Analytics",
          content: `
            View performance metrics specific to each account.
            Compare performance across accounts.
            Identify which accounts are most profitable.
            Make informed decisions about capital allocation.
          `,
        },
      ],
    },
    {
      id: "risk",
      title: "Risk Management",
      description: "Tools to protect your trading account",
      subsections: [
        {
          title: "Position Sizing Calculator",
          content: `
            Use this tool to calculate proper position sizes based on:
            • Account size
            • Risk per trade (typically 1-2%)
            • Stop loss distance
            
            Never risk more than you can afford to lose.
          `,
        },
        {
          title: "Daily Loss Alerts",
          content: `
            Set a maximum daily loss limit.
            Get alerts when you're approaching this limit.
            Automatically triggered alerts help you take breaks before big losses.
          `,
        },
        {
          title: "Risk/Reward Ratios",
          content: `
            Only take trades with favorable risk/reward (typically 1:2 minimum).
            Track your average risk/reward ratio over time.
            Improve this metric to increase profitability.
          `,
        },
      ],
    },
    {
      id: "reports",
      title: "Reports & Export",
      description: "Generating reports and sharing progress",
      subsections: [
        {
          title: "Performance Reports",
          content: `
            Generate detailed PDF reports including:
            • Win rate and profit factor
            • Monthly performance breakdown
            • Equity curve visualization
            • Performance by strategy
            • Performance by symbol
            
            Available on Pro+ plans.
          `,
        },
        {
          title: "Exporting Data",
          content: `
            Export your trade data in multiple formats:
            • CSV for analysis in Excel
            • PDF for sharing with mentors
            • Excel for detailed reporting
            
            Use exports for backup and external analysis.
          `,
        },
        {
          title: "Sharing Analysis",
          content: `
            Share specific reports with mentors, accountants, or colleagues.
            Available on Pro+ plans.
            Great for getting feedback and proving your trading results.
          `,
        },
      ],
    },
  ];

  const toggleSection = (id: string) => {
    setExpandedSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const filteredDocs = documentation.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white dark:bg-[#0D1117]">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-[#0D1117] py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 text-center">
            Documentation
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 text-center max-w-3xl mx-auto mb-8">
            Complete guide to all Tradia features and how to use them.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 py-3 text-lg"
            />
          </div>
        </div>
      </div>

      {/* Documentation Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleSection(doc.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="text-left">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {doc.title}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {doc.description}
                  </p>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${
                    expandedSections.includes(doc.id) ? "rotate-180" : ""
                  }`}
                />
              </button>

              {expandedSections.includes(doc.id) && (
                <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-4 bg-gray-50 dark:bg-gray-900">
                  <div className="space-y-6">
                    {doc.subsections.map((subsection, index) => (
                      <div key={index}>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                          {subsection.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line text-sm">
                          {subsection.content.trim()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {filteredDocs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                No documentation found for &quot;{searchQuery}&quot;. Try a different search term.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tips Section */}
      <div className="bg-blue-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
             Can&apos;t find what you&apos;re looking for?
           </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Check out our learning resources or contact support for help.
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href="/resources"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Learning Resources
            </a>
            <a
              href="/contact"
              className="inline-block px-6 py-2 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
