"use client";

import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, GraduationCap, Video, Heart, CheckCircle, Zap } from "lucide-react";
import { motion } from "framer-motion";

/**
 * TraderEducation.tsx
 * - No white backgrounds: transparent/backdrop panels everywhere for a sleek dashboard look
 * - Inputs transparent with clear borders (mobile-friendly)
 * - All links route to TELEGRAM / YOUTUBE / HEADWAY promotional links specified by you
 * - Typed handlers, React.ReactElement return
 */

type Resource = {
  id: string;
  type: "course" | "article" | "video" | "setups" | string;
  title: string;
  description: string;
  icon: React.ReactNode;
  tags?: string[];
};

const TELEGRAM = "https://t.me/theabdulmuizchannel";
const YOUTUBE = "https://www.youtube.com/@AbdulmuizAdeyemo";
const HEADWAY = "https://headway.partners/user/signup?hwp=bebd4f";
const HEADWAY_BANNER = "https://headway.partners/promo/giftshop/?hwp=bebd4f";
const HEADWAY_BONUS = "https://headway.partners/landings/en/bonus-111-2/?hwp=bebd4f";
const HEADWAY_DEPOSIT_BONUS = "https://hw.online/landings/en/deposit-bonus-2/?hwp=bebd4f";

const RESOURCES: Resource[] = [
  {
    id: "psych-101",
    type: "course",
    title: "Trading Psychology 101",
    description:
      "Master the mindset of consistently profitable traders — bias control, routine, and decision rules.",
    icon: <GraduationCap className="w-5 h-5 text-indigo-400" />,
    tags: ["psychology", "mindset"],
  },
  {
    id: "risk-basics",
    type: "article",
    title: "Risk Management Basics",
    description: "Understand how to manage capital, position size and avoid catastrophic drawdowns.",
    icon: <BookOpen className="w-5 h-5 text-emerald-400" />,
    tags: ["risk", "money-management"],
  },
  {
    id: "smc-video",
    type: "video",
    title: "Smart Money Concepts (SMC) — Intro",
    description:
      "Video walkthrough of institutional techniques: order blocks, liquidity, and market structure.",
    icon: <Video className="w-5 h-5 text-rose-400" />,
    tags: ["smc", "structure"],
  },
  {
    id: "journaling",
    type: "article",
    title: "Trade Journaling 101",
    description:
      "How to keep a trade journal that actually makes you better — templates & examples.",
    icon: <BookOpen className="w-5 h-5 text-indigo-400" />,
    tags: ["journaling", "process"],
  },
  {
    id: "setups",
    type: "setups",
    title: "Top setup: Order Block Pullback",
    description:
      "Example: Wait for BOS, then pullback into order block on the higher timeframe and trade with trend.",
    icon: <Zap className="w-5 h-5 text-yellow-400" />,
    tags: ["smc", "order-block"],
  },
];

const panelClass =
  "rounded-xl p-4 border border-gray-200/10 dark:border-gray-700/30 backdrop-blur-sm";

export default function TraderEducation(): React.ReactElement {
  const [tab, setTab] = useState<"courses" | "videos" | "articles" | "setups" | "tools">("courses");
  const [query, setQuery] = useState<string>("");
  const [subscribed, setSubscribed] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");

  // risk calculator state
  const [account, setAccount] = useState<number>(1000);
  const [riskPct, setRiskPct] = useState<number>(1);
  const [stopPips, setStopPips] = useState<number>(20);
  const [pipValue, setPipValue] = useState<number>(10);

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
    const riskAmount = (account * riskPct) / 100;
    const lots = stopPips * pipValue > 0 ? +(riskAmount / (stopPips * pipValue)).toFixed(2) : 0;
    return { riskAmount: Math.round(riskAmount * 100) / 100, lots };
  }, [account, riskPct, stopPips, pipValue]);

  const handleSubscribe = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!email.includes("@")) {
      alert("Please enter a valid email.");
      return;
    }
    localStorage.setItem("tradia:edu:subscribed", "1");
    setSubscribed(true);
    alert("Thanks — we've added your email to the education list. Check your inbox.");
  };

  function downloadCheatSheet(): void {
    const text = `Tradia Cheat Sheet
- Always size to risk %
- Use journal to record setups and emotions
- Check higher timeframe structure
- Reduce lot size before news
`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tradia-cheatsheet.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  // map resource type to a promotional destination
  const getResourceLink = (r: Resource): string => {
    if (r.type === "video") return YOUTUBE;
    if (r.type === "setups") return TELEGRAM;
    // otherwise drive conversion to Headway signup / banner
    return HEADWAY;
  };

  return (
    <div className="mt-6 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">Trader Education</h2>
              <p className="mt-1 text-sm text-gray-400 max-w-xl">
                Practical lessons, step-by-step setups and tools to reduce mistakes and trade with edge. Links lead to tutorials (YouTube),
                free setups (Telegram), and our recommended broker (Headway — signup promo & bonuses).
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-3">
              <a
                href={TELEGRAM}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-black px-3 py-2 rounded-full font-semibold"
              >
                Join Telegram → 
              </a>
            </div>
          </div>

          {/* search + tabs */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <div
                className="flex items-center gap-2 rounded-full px-3 py-2 border border-gray-200/10 dark:border-gray-700/30"
                style={{ background: "transparent" }}
              >
                <input
                  value={query}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-500 text-gray-100"
                  placeholder="Search courses, articles, setups..."
                  aria-label="Search education"
                />
                <button onClick={() => setQuery("")} className="text-xs text-gray-400">
                  Clear
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(["courses", "videos", "articles", "setups", "tools"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-2 rounded-full text-sm font-medium ${
                    tab === t ? "bg-indigo-600 text-white shadow" : "bg-transparent text-gray-300 border border-gray-200/6"
                  }`}
                  aria-pressed={tab === t}
                >
                  {t === "courses"
                    ? "Courses"
                    : t === "videos"
                    ? "Videos"
                    : t === "articles"
                    ? "Articles"
                    : t === "setups"
                    ? "Setups & Signals"
                    : "Tools"}
                </button>
              ))}
            </div>
          </div>

          {/* grid */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered
              .filter((r) => {
                if (tab === "courses") return r.type === "course" || r.type === "article";
                if (tab === "videos") return r.type === "video";
                if (tab === "articles") return r.type === "article" || r.type === "course";
                if (tab === "setups") return r.type === "setups";
                return true;
              })
              .map((item) => (
                <motion.a
                  key={item.id}
                  href={getResourceLink(item)}
                  target="_blank"
                  rel="noreferrer"
                  whileHover={{ y: -4 }}
                  className={`${panelClass} group transition`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate text-gray-100">{item.title}</h3>
                      <p className="mt-1 text-sm text-gray-400 line-clamp-3">{item.description}</p>
                      <div className="mt-2 text-xs text-gray-400">Tags: {(item.tags || []).join(", ")}</div>
                    </div>
                  </div>
                </motion.a>
              ))}

            {/* setups full-width preview */}
            {tab === "setups" && (
              <div className="col-span-1 md:col-span-2 lg:col-span-3">
                <div className={`${panelClass} flex flex-col gap-3`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-100">Live signals preview</h3>
                      <p className="text-sm text-gray-400">Free setups posted to Telegram — join to receive real-time alerts.</p>
                    </div>

                    <a
                      href={TELEGRAM}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 bg-amber-400 px-3 py-2 rounded-full text-black font-semibold"
                    >
                      Join Telegram
                    </a>
                  </div>

                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-200/6"
                        style={{ background: "transparent" }}
                      >
                        <div>
                          <div className="text-sm font-semibold text-gray-100">EURUSD • Buy</div>
                          <div className="text-xs text-gray-400">Entry: 1.0872 · TP: 1.0900 · SL: 1.0840</div>
                        </div>
                        <div className="text-xs text-gray-400">{["2m", "5m", "10m", "1h", "3h"][i % 5]} ago</div>
                      </div>
                    ))}
                  </div>

                  <div className="text-sm text-gray-400">Signals are educational — always back-test and use your risk plan.</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: tools */}
        <aside className="w-full lg:w-96 flex-shrink-0">
          <div className="sticky top-20 space-y-4">
            {/* Risk calculator */}
            <div className={panelClass}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-300">
                  <CheckCircle className="w-5 h-5 text-indigo-400" />
                  <div className="font-semibold text-gray-100">Risk calculator</div>
                </div>
                <div className="text-xs text-gray-400">Quick calc</div>
              </div>

              <div className="mt-3 text-sm space-y-2">
                <label className="block text-xs text-gray-400">Account balance</label>
                <input
                  type="number"
                  value={account}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAccount(Number(e.target.value) || 0)}
                  className="w-full p-2 rounded border border-gray-200/6 bg-transparent text-gray-100"
                />

                <label className="block text-xs text-gray-400">Risk % per trade</label>
                <input
                  type="number"
                  value={riskPct}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRiskPct(Number(e.target.value) || 0)}
                  className="w-full p-2 rounded border border-gray-200/6 bg-transparent text-gray-100"
                />

                <label className="block text-xs text-gray-400">Stop (pips)</label>
                <input
                  type="number"
                  value={stopPips}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStopPips(Number(e.target.value) || 0)}
                  className="w-full p-2 rounded border border-gray-200/6 bg-transparent text-gray-100"
                />

                <label className="block text-xs text-gray-400">Pip value ($ per lot)</label>
                <input
                  type="number"
                  value={pipValue}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPipValue(Number(e.target.value) || 0)}
                  className="w-full p-2 rounded border border-gray-200/6 bg-transparent text-gray-100"
                />

                <div className="mt-2 p-3 rounded-lg border border-gray-200/6">
                  <div className="text-xs text-gray-400">Risk amount</div>
                  <div className="font-semibold text-gray-100">${positionSize.riskAmount.toLocaleString()}</div>
                  <div className="text-xs text-gray-400 mt-2">Suggested lot size</div>
                  <div className="font-semibold text-gray-100">{positionSize.lots} lots</div>
                </div>

                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(`Risk: $${positionSize.riskAmount}, Lots: ${positionSize.lots}`);
                      alert("Copied to clipboard");
                    }}
                    className="flex-1 px-3 py-2 rounded bg-indigo-600 text-white"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => {
                      setAccount(1000);
                      setRiskPct(1);
                      setStopPips(20);
                      setPipValue(10);
                    }}
                    className="flex-1 px-3 py-2 rounded border"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Checklist */}
            <div className={panelClass}>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                <div className="font-semibold text-gray-100">Pre-trade checklist</div>
              </div>
              <ul className="mt-3 text-sm space-y-2 text-gray-400">
                <li>✅ Higher timeframe structure aligns</li>
                <li>✅ News / events checked</li>
                <li>✅ Risk & position size confirmed</li>
                <li>✅ Clear entry, SL & TP</li>
                <li>✅ Journal note created</li>
              </ul>
            </div>

            {/* Cheat sheet + subscribe */}
            <div className={panelClass}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-400" />
                  <div className="font-semibold text-gray-100">Cheat sheet</div>
                </div>
                <div className="text-xs text-gray-400">Download</div>
              </div>

              <p className="mt-2 text-sm text-gray-400">Download the one-page checklist and quick rules to trade better.</p>

              <div className="mt-3 flex gap-2">
                <a
                  href={HEADWAY_BANNER}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 px-3 py-2 rounded bg-indigo-600 text-white text-center"
                >
                  Headway Giftshop → (promo)
                </a>
                <a href={TELEGRAM} target="_blank" rel="noreferrer" className="flex-1 px-3 py-2 rounded border text-center">
                  Join Telegram
                </a>
              </div>

              <form onSubmit={handleSubscribe} className="mt-3 flex gap-2">
                <input
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  placeholder="Email for education"
                  className="flex-1 p-2 rounded border border-gray-200/6 bg-transparent text-gray-100"
                />
                <button type="submit" className="px-3 py-2 rounded bg-emerald-400 text-black font-semibold">
                  Subscribe
                </button>
              </form>

              {subscribed && <div className="mt-2 text-xs text-green-400">You're subscribed — check your inbox.</div>}
            </div>

            {/* Recommended next steps */}
            <div className={panelClass}>
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-400" />
                <div className="font-semibold text-gray-100">Recommended</div>
              </div>
              <ol className="mt-3 text-sm text-gray-400 space-y-2">
                <li>1. Create a trade plan and stick to it.</li>
                <li>2. Use Tradia's journal for every trade.</li>
                <li>3. Backtest setups for at least 50 trades.</li>
                <li>4. Reduce lot size around news and Friday close.</li>
              </ol>

              <div className="mt-3 flex gap-2">
                <a
                  href={HEADWAY_BONUS}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 px-3 py-2 rounded bg-indigo-600 text-white text-center"
                >
                  Open Headway (Get $111 bonus)
                </a>
              </div>

              <div className="mt-2 text-xs text-gray-400">
                New to Headway? Min deposit $5. <a href={HEADWAY_DEPOSIT_BONUS} target="_blank" rel="noreferrer" className="underline">Deposit bonus details</a>.
              </div>
            </div>

            <div className="text-center text-xs text-gray-400">
              Need help? Message on Telegram <a href={TELEGRAM} target="_blank" rel="noreferrer" className="underline">here</a>.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
