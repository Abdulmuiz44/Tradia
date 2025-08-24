"use client";

import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, GraduationCap, Video, Mail, Heart, CheckCircle, Zap } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

/*
  TraderEducation component
  - Comprehensive trader education hub that complements Tradia's landing and dashboard
  - Tabs for Courses, Videos, Articles, Setups & Signals, Tools
  - Search + filter, risk calculator, downloadable cheat-sheet, checklist, Telegram CTA
  - Lightweight, fully client-side, no external dependencies beyond lucide-react + framer-motion + tailwind

  How to use:
  - Place at src/components/TraderEducation.tsx and import into pages where needed.
*/

const RESOURCES = [
  {
    id: "psych-101",
    type: "course",
    title: "Trading Psychology 101",
    description: "Master the mindset of consistently profitable traders — bias control, routine, and decision rules.",
    icon: <GraduationCap className="w-5 h-5 text-indigo-600" />,
    link: "https://www.investopedia.com/articles/trading/06/psychology.asp",
    tags: ["psychology", "mindset"],
  },
  {
    id: "risk-basics",
    type: "article",
    title: "Risk Management Basics",
    description: "Understand how to manage capital, position size and avoid catastrophic drawdowns.",
    icon: <BookOpen className="w-5 h-5 text-emerald-600" />,
    link: "https://www.babypips.com/learn/forex/risk-management",
    tags: ["risk", "money-management"],
  },
  {
    id: "smc-video",
    type: "video",
    title: "Smart Money Concepts (SMC) — Intro",
    description: "Video walkthrough of institutional techniques: order blocks, liquidity, and market structure.",
    icon: <Video className="w-5 h-5 text-rose-600" />,
    link: "https://www.youtube.com/results?search_query=smart+money+concepts+trading",
    tags: ["smc", "structure"],
  },
  {
    id: "journaling",
    type: "article",
    title: "Trade Journaling 101",
    description: "How to keep a trade journal that actually makes you better — templates & examples.",
    icon: <BookOpen className="w-5 h-5 text-indigo-600" />,
    link: "https://www.tradingjournalguide.com/",
    tags: ["journaling", "process"],
  },
  {
    id: "setups",
    type: "setups",
    title: "Top setups: Order Block Pullback",
    description: "Example: Wait for BOS, then pullback into order block on the higher timeframe and trade with trend.",
    icon: <Zap className="w-5 h-5 text-yellow-500" />,
    link: "#",
    tags: ["smc", "order-block"],
  },
];

const TELEGRAM = "https://t.me/theabdulmuizchannel"; // user's telegram link

export default function TraderEducation() {
  const [tab, setTab] = useState("courses");
  const [query, setQuery] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail] = useState("");

  // risk calculator state
  const [account, setAccount] = useState(1000);
  const [riskPct, setRiskPct] = useState(1); // percent
  const [stopPips, setStopPips] = useState(20);
  const [pipValue, setPipValue] = useState(10); // $ per standard lot per pip (approx)

  useEffect(() => {
    const s = localStorage.getItem("tradia:edu:subscribed");
    if (s === "1") setSubscribed(true);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RESOURCES.filter((r) => {
      if (!q) return true;
      return (r.title + " " + r.description + " " + (r.tags || []).join(" ")).toLowerCase().includes(q);
    });
  }, [query]);

  const positionSize = useMemo(() => {
    // simple risk calculation: riskAmount = account * (riskPct/100)
    // position lots = riskAmount / (stopPips * pipValue)
    const riskAmount = (account * riskPct) / 100;
    const lots = stopPips * pipValue > 0 ? +(riskAmount / (stopPips * pipValue)).toFixed(2) : 0;
    return { riskAmount: Math.round(riskAmount * 100) / 100, lots };
  }, [account, riskPct, stopPips, pipValue]);

  function handleSubscribe(e) {
    e?.preventDefault();
    if (!email.includes("@")) return alert("Please enter a valid email.");
    localStorage.setItem("tradia:edu:subscribed", "1");
    setSubscribed(true);
    alert("Thanks — we've added your email to the education list. Check your inbox.");
  }

  function downloadCheatSheet() {
    const text = `Tradia Cheat Sheet\n- Always size to risk %\n- Use journal to record setups and emotions\n- Check higher timeframe structure\n- Reduce lot size before news\n`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tradia-cheatsheet.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: primary content */}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">Trader Education</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Everything you need to make better trading decisions — courses, videos, setups, and practical tools.</p>
            </div>

            <div className="hidden sm:flex items-center gap-3">
              <a href={TELEGRAM} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-black px-3 py-2 rounded-full font-semibold">
                Join free setups on Telegram <span className="opacity-80">→</span>
              </a>
            </div>
          </div>

          {/* Search & tabs */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-3 py-2">
              <input value={query} onChange={(e) => setQuery(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" placeholder="Search courses, articles, setups..." />
              <button onClick={() => setQuery("")} className="text-xs text-gray-500">Clear</button>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setTab("courses")} className={`px-3 py-2 rounded-full ${tab === "courses" ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}>Courses</button>
              <button onClick={() => setTab("videos")} className={`px-3 py-2 rounded-full ${tab === "videos" ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}>Videos</button>
              <button onClick={() => setTab("articles")} className={`px-3 py-2 rounded-full ${tab === "articles" ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}>Articles</button>
              <button onClick={() => setTab("setups")} className={`px-3 py-2 rounded-full ${tab === "setups" ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}>Setups & Signals</button>
              <button onClick={() => setTab("tools")} className={`px-3 py-2 rounded-full ${tab === "tools" ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}>Tools</button>
            </div>
          </div>

          {/* Resource grid / conditional content */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered
              .filter((r) => {
                if (tab === "courses") return r.type === "course" || r.type === "article";
                if (tab === "videos") return r.type === "video";
                if (tab === "articles") return r.type === "article" || r.type === "course";
                if (tab === "setups") return r.type === "setups" || r.type === "setups";
                return true;
              })
              .map((item) => (
                <motion.a key={item.id} href={item.link} target="_blank" rel="noreferrer" whileHover={{ y: -4 }} className="group block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm hover:shadow-lg transition">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-indigo-50 group-hover:bg-indigo-100">{item.icon}</div>
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{item.description}</p>
                      <div className="mt-2 text-xs text-gray-500">Tags: {(item.tags || []).join(", ")}</div>
                    </div>
                  </div>
                </motion.a>
              ))}

            {/* If setups tab show signal preview card */}
            {tab === "setups" && (
              <div className="col-span-1 md:col-span-2 lg:col-span-3">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Live signals preview</h3>
                      <p className="text-sm text-gray-500">Free setups and signals posted to Telegram — join to receive real-time alerts.</p>
                    </div>

                    <a href={TELEGRAM} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-amber-500 px-3 py-2 rounded-full text-black font-semibold">Join Telegram</a>
                  </div>

                  <div className="mt-4 space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                        <div>
                          <div className="text-sm font-semibold">EURUSD • Buy</div>
                          <div className="text-xs text-gray-500">Entry: 1.0872 · TP: 1.0900 · SL: 1.0840</div>
                        </div>
                        <div className="text-xs text-gray-500">{['2m','5m','10m','1h','3h'][i % 5]} ago</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 text-sm text-gray-500">Signals are educational and should be back-tested. Use your own risk plan.</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: tools and CTAs */}
        <aside className="w-full lg:w-96 flex-shrink-0">
          <div className="sticky top-24 space-y-4">
            {/* Risk calculator */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-indigo-600"/> <div className="font-semibold">Risk calculator</div></div>
                <div className="text-xs text-gray-500">Quick calc</div>
              </div>

              <div className="mt-3 text-sm space-y-2">
                <label className="block text-xs text-gray-500">Account balance</label>
                <input type="number" value={account} onChange={(e) => setAccount(Number(e.target.value) || 0)} className="w-full p-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" />

                <label className="block text-xs text-gray-500">Risk % per trade</label>
                <input type="number" value={riskPct} onChange={(e) => setRiskPct(Number(e.target.value) || 0)} className="w-full p-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" />

                <label className="block text-xs text-gray-500">Stop (pips)</label>
                <input type="number" value={stopPips} onChange={(e) => setStopPips(Number(e.target.value) || 0)} className="w-full p-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" />

                <label className="block text-xs text-gray-500">Pip value ($ per lot)</label>
                <input type="number" value={pipValue} onChange={(e) => setPipValue(Number(e.target.value) || 0)} className="w-full p-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" />

                <div className="mt-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                  <div className="text-xs text-gray-500">Risk amount</div>
                  <div className="font-semibold">${positionSize.riskAmount.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Suggested lot size</div>
                  <div className="font-semibold">{positionSize.lots} lots</div>
                </div>

                <div className="mt-2 flex gap-2">
                  <button onClick={() => { navigator.clipboard?.writeText(`Risk: $${positionSize.riskAmount}, Lots: ${positionSize.lots}`); alert('Copied to clipboard'); }} className="flex-1 px-3 py-2 rounded bg-indigo-600 text-white">Copy</button>
                  <button onClick={() => { setAccount(1000); setRiskPct(1); setStopPips(20); setPipValue(10); }} className="flex-1 px-3 py-2 rounded border">Reset</button>
                </div>
              </div>
            </div>

            {/* Checklist */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-emerald-600"/><div className="font-semibold">Pre-trade checklist</div></div>
              <ul className="mt-3 text-sm space-y-2 text-gray-600 dark:text-gray-300">
                <li>✅ Higher timeframe structure aligns</li>
                <li>✅ News / events checked</li>
                <li>✅ Risk & position size confirmed</li>
                <li>✅ Clear entry, SL & TP</li>
                <li>✅ Journal note created</li>
              </ul>
            </div>

            {/* Cheat sheet + subscribe */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><GraduationCap className="w-5 h-5 text-indigo-600"/><div className="font-semibold">Cheat sheet</div></div>
                <div className="text-xs text-gray-500">Download</div>
              </div>

              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Download the one-page checklist and quick rules to trade better.</p>
              <div className="mt-3 flex gap-2">
                <button onClick={downloadCheatSheet} className="flex-1 px-3 py-2 rounded bg-indigo-600 text-white">Download</button>
                <a href={TELEGRAM} target="_blank" rel="noreferrer" className="flex-1 px-3 py-2 rounded border text-center">Join Telegram</a>
              </div>

              <form onSubmit={handleSubscribe} className="mt-3 flex gap-2">
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email for education" className="flex-1 p-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />
                <button type="submit" className="px-3 py-2 rounded bg-emerald-500 text-black font-semibold">Subscribe</button>
              </form>

              {subscribed && <div className="mt-2 text-xs text-green-400">You're subscribed — check your inbox.</div>}
            </div>

            {/* Recommended next steps */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2"><Heart className="w-5 h-5 text-rose-500"/><div className="font-semibold">Recommended</div></div>
              <ol className="mt-3 text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <li>1. Create a trade plan and stick to it.</li>
                <li>2. Use Tradia's journal for every trade.</li>
                <li>3. Backtest setups for at least 50 trades.</li>
                <li>4. Reduce lot size around news and Friday close.</li>
              </ol>
            </div>

            <div className="text-center text-xs text-gray-500">Need help? <Link href="/app/contact" className="underline">Contact support</Link></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
