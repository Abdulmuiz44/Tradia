"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { BookOpen, GraduationCap, Video, Heart, CheckCircle, Zap } from "lucide-react";
import { motion } from "framer-motion";

/**
 * TraderEducation.tsx
 * - No white backgrounds: uses transparent/backdrop panels for sleek dashboard look
 * - Tabs reduced to Videos (YouTube), Setups (Telegram), Tools (Headway)
 * - All external links point to TELEGRAM / YOUTUBE / HEADWAY promo links supplied
 * - Checklist items are interactive and persisted to localStorage
 * - Cheat sheet + journal CSV downloads included
 * - Risk calculator Reset sets all inputs to 0 (as requested)
 * - Inputs styled transparent with clear borders for both light/dark
 * - Fully typed for TypeScript; returns React.ReactElement
 */

/* ---------- Promo links (as requested) ---------- */
const TELEGRAM = "https://t.me/theabdulmuizchannel";
const YOUTUBE = "https://www.youtube.com/@AbdulmuizAdeyemo";
const HEADWAY_SIGNUP = "https://headway.partners/user/signup?hwp=bebd4f";
const HEADWAY_GIFTS = "https://headway.partners/promo/giftshop/?hwp=bebd4f";
const HEADWAY_BONUS = "https://headway.partners/landings/en/bonus-111-2/?hwp=bebd4f";
const HEADWAY_DEPOSIT = "https://hw.online/landings/en/deposit-bonus-2/?hwp=bebd4f";

/* ---------- Resources (texts only; links are resolved by type) ---------- */
type Resource = {
  id: string;
  type: "video" | "setups" | "tool";
  title: string;
  description: string;
  icon?: React.ReactNode;
  tags?: string[];
};

const RESOURCES: Resource[] = [
  {
    id: "smc-intro",
    type: "video",
    title: "Smart Money Concepts — Quick Intro",
    description: "Short, actionable breakdown of order blocks, liquidity and structure.",
    icon: <Video className="w-5 h-5 text-rose-400" />,
    tags: ["smc", "structure"],
  },
  {
    id: "risk-manage",
    type: "video",
    title: "Position Sizing & Risk Rules",
    description: "Simple sizing rules to avoid wipeouts and survive losing streaks.",
    icon: <GraduationCap className="w-5 h-5 text-indigo-400" />,
    tags: ["risk", "sizing"],
  },
  {
    id: "telegram-signals",
    type: "setups",
    title: "Live setups & signals",
    description: "Join Telegram to receive real-time setups and updates.",
    icon: <Zap className="w-5 h-5 text-yellow-400" />,
    tags: ["signals", "live"],
  },
  {
    id: "headway-offer",
    type: "tool",
    title: "Headway — Signup & Bonuses",
    description: "Open Headway (min $5) to claim promo gifts & $111 bonus for new members.",
    icon: <CheckCircle className="w-5 h-5 text-emerald-400" />,
    tags: ["broker", "promo"],
  },
];

const PANEL =
  "rounded-xl p-4 border border-gray-200/8 dark:border-gray-700/20 backdrop-blur-sm";

/* ---------- Utility download helpers ---------- */
function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${(c ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- Component ---------- */
export default function TraderEducation(): React.ReactElement {
  // Only 3 tabs as requested
  const [tab, setTab] = useState<"videos" | "setups" | "tools">("videos");
  const [query, setQuery] = useState<string>("");

  // risk calculator fields
  const [account, setAccount] = useState<number>(0);
  const [riskPct, setRiskPct] = useState<number>(0);
  const [stopPips, setStopPips] = useState<number>(0);
  const [pipValue, setPipValue] = useState<number>(0);

  // checklist state persisted
  const CHECKLIST_KEY = "tradia:checklist:v1";
  const defaultChecklist = [
    { id: "hf", label: "Higher timeframe structure aligns", done: false },
    { id: "news", label: "News / events checked", done: false },
    { id: "risk", label: "Risk & position size confirmed", done: false },
    { id: "plan", label: "Clear entry, SL & TP", done: false },
    { id: "journal", label: "Journal note created", done: false },
  ];
  const [checklist, setChecklist] = useState(defaultChecklist);

  useEffect(() => {
    const saved = localStorage.getItem(CHECKLIST_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { id: string; label: string; done: boolean }[];
        setChecklist(parsed);
      } catch {
        setChecklist(defaultChecklist);
      }
    }
  }, []); // load-once

  useEffect(() => {
    // persist checklist
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(checklist));
  }, [checklist]);

  // derived position size
  const position = useMemo(() => {
    const riskAmount = (account * riskPct) / 100;
    const lots = stopPips * pipValue > 0 ? +(riskAmount / (stopPips * pipValue)).toFixed(2) : 0;
    return { riskAmount: Math.round(riskAmount * 100) / 100, lots };
  }, [account, riskPct, stopPips, pipValue]);

  // filter resources by tab + search
  const filteredResources = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RESOURCES.filter((r) => {
      if (tab === "videos" && r.type !== "video") return false;
      if (tab === "setups" && r.type !== "setups") return false;
      if (tab === "tools" && r.type !== "tool") return false;
      if (!q) return true;
      return (r.title + " " + r.description + " " + (r.tags || []).join(" ")).toLowerCase().includes(q);
    });
  }, [tab, query]);

  // helpers for mapping a resource to a destination link
  const resourceLink = (r: Resource): string => {
    if (r.type === "video") return YOUTUBE;
    if (r.type === "setups") return TELEGRAM;
    if (r.type === "tool") return HEADWAY_SIGNUP;
    return TELEGRAM;
  };

  const toggleChecklist = (id: string) => {
    setChecklist((c) => c.map((it) => (it.id === id ? { ...it, done: !it.done } : it)));
  };

  const resetChecklist = () => {
    setChecklist(defaultChecklist.map((d) => ({ ...d, done: false })));
  };

  // Reset as requested: sets fields to 0 (not defaults)
  const resetCalculator = () => {
    setAccount(0);
    setRiskPct(0);
    setStopPips(0);
    setPipValue(0);
  };

  const downloadCheat = () => {
    const text = `Tradia - One-page Cheat Sheet
- Always size to risk %
- Use journal to record setups and emotions
- Check higher timeframe structure
- Reduce lot size before news
- Keep R:R >= 1:2 when possible
`;
    downloadTextFile("tradia-cheatsheet.txt", text);
  };

  const downloadJournalTemplate = () => {
    const rows = [
      ["Date", "Symbol", "Direction", "Entry", "Exit", "Stop", "Size(lots)", "P/L", "Reason", "Execution notes", "Emotion"],
      // sample row
      ["2025-01-01", "EURUSD", "Buy", "1.0872", "1.0900", "1.0840", "0.10", "+28", "Order block pullback", "Good entry", "Calm"],
    ];
    downloadCSV("tradia-trade-journal.csv", rows);
  };

  return (
    <div className="mt-6 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left column */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-100">Trader Education</h2>
              <p className="mt-1 text-sm text-gray-400 max-w-xl">
                Practical videos (YouTube), live setups (Telegram) and tools/promos (Headway). All learning links go directly to the founder&apos;s channels/youtube.
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-3">
              <a
                href={TELEGRAM}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-black px-3 py-2 rounded-full font-semibold"
              >
                Join Telegram
              </a>
            </div>
          </div>

          {/* search + tabs */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 rounded-full px-3 py-2 border border-gray-200/6">
                <input
                  value={query}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm text-gray-100 placeholder:text-gray-500"
                  placeholder="Search videos, setups, tools..."
                />
                <button onClick={() => setQuery("")} className="text-xs text-gray-400">
                  Clear
                </button>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setTab("videos")}
                className={`px-3 py-2 rounded-full text-sm font-medium ${
                  tab === "videos" ? "bg-indigo-600 text-white shadow" : "bg-transparent text-gray-300 border border-gray-200/6"
                }`}
                aria-pressed={tab === "videos"}
              >
                Videos
              </button>

              <button
                onClick={() => setTab("setups")}
                className={`px-3 py-2 rounded-full text-sm font-medium ${
                  tab === "setups" ? "bg-indigo-600 text-white shadow" : "bg-transparent text-gray-300 border border-gray-200/6"
                }`}
                aria-pressed={tab === "setups"}
              >
                Setups & Signals
              </button>

              <button
                onClick={() => setTab("tools")}
                className={`px-3 py-2 rounded-full text-sm font-medium ${
                  tab === "tools" ? "bg-indigo-600 text-white shadow" : "bg-transparent text-gray-300 border border-gray-200/6"
                }`}
                aria-pressed={tab === "tools"}
              >
                Tools & Promos
              </button>
            </div>
          </div>

          {/* Resources grid */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResources.map((r) => (
              <motion.a
                key={r.id}
                href={resourceLink(r)}
                target="_blank"
                rel="noreferrer"
                whileHover={{ y: -4 }}
                className={`${PANEL} group transition`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                    {r.icon}
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-100 truncate">{r.title}</h3>
                    <p className="mt-1 text-sm text-gray-400 line-clamp-3">{r.description}</p>
                    {r.tags && <div className="mt-2 text-xs text-gray-400">Tags: {r.tags.join(", ")}</div>}
                  </div>
                </div>
              </motion.a>
            ))}

            {/* If no resources found show CTA */}
            {filteredResources.length === 0 && (
              <div className={`${PANEL} col-span-full text-center`}>
                <div className="text-gray-100 font-semibold">No resources found</div>
                <div className="text-sm text-gray-400">Try clearing the search or switch tabs.</div>
              </div>
            )}
          </div>

          {/* Headway promo banners (visual CTA area) */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href={HEADWAY_GIFTS}
              target="_blank"
              rel="noreferrer"
              className={`${PANEL} flex items-center justify-between gap-4`}
            >
              <div>
                <div className="text-sm text-amber-300 font-semibold">Headway Promo</div>
                <div className="mt-1 font-bold text-gray-100">Trade lots — get gifts</div>
                <div className="text-sm text-gray-400 mt-1">Open an account with Headway (min $5) and claim promo gifts.</div>
              </div>
              <div className="relative h-20 w-28 overflow-hidden rounded-md">
                <Image
                  src="/mnt/data/giftshop_en_10.png"
                  alt="Headway Giftshop banner"
                  fill
                  className="object-cover"
                  sizes="112px"
                />
              </div>
            </a>

            <a
              href={HEADWAY_BONUS}
              target="_blank"
              rel="noreferrer"
              className={`${PANEL} flex items-center justify-between gap-4`}
            >
              <div>
                <div className="text-sm text-indigo-300 font-semibold">Welcome bonus</div>
                <div className="mt-1 font-bold text-gray-100">Get Bonus $111</div>
                <div className="text-sm text-gray-400 mt-1">New members can claim a $111 trading bonus — see landing for details.</div>
              </div>
              <div className="relative h-20 w-28 overflow-hidden rounded-md">
                <Image
                  src="/mnt/data/bonus111_en_6.png"
                  alt="Headway bonus"
                  fill
                  className="object-cover"
                  sizes="112px"
                />
              </div>
            </a>
          </div>
        </div>

        {/* Right column (tools & CTAs) */}
        <aside className="w-full lg:w-96 flex-shrink-0">
          <div className="sticky top-20 space-y-4">
            {/* Risk Calculator */}
            <div className={PANEL}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-100">
                  <CheckCircle className="w-5 h-5 text-indigo-400" />
                  <div className="font-semibold">Risk calculator</div>
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
                  <div className="font-semibold text-gray-100">${position.riskAmount.toLocaleString()}</div>
                  <div className="text-xs text-gray-400 mt-2">Suggested lot size</div>
                  <div className="font-semibold text-gray-100">{position.lots} lots</div>
                </div>

                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(`Risk: $${position.riskAmount}, Lots: ${position.lots}`);
                      alert("Copied to clipboard");
                    }}
                    className="flex-1 px-3 py-2 rounded bg-indigo-600 text-white"
                  >
                    Copy
                  </button>

                  <button onClick={resetCalculator} className="flex-1 px-3 py-2 rounded border text-gray-100">
                    Reset (set to 0)
                  </button>
                </div>
              </div>
            </div>

            {/* Checklist - interactive */}
            <div className={PANEL}>
              <div className="flex items-center gap-2 text-gray-100">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                <div className="font-semibold">Pre-trade checklist</div>
              </div>

              <div className="mt-3 space-y-2">
                {checklist.map((it) => (
                  <label
                    key={it.id}
                    className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-100"
                  >
                    <input
                      type="checkbox"
                      checked={it.done}
                      onChange={() => toggleChecklist(it.id)}
                      className="w-4 h-4 rounded border-gray-300 bg-transparent"
                    />
                    <span className={`${it.done ? "line-through text-gray-400" : "text-gray-100"}`}>{it.label}</span>
                  </label>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <button onClick={resetChecklist} className="flex-1 px-3 py-2 rounded border text-gray-100">
                  Reset checklist
                </button>
                <a
                  href={TELEGRAM}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 px-3 py-2 rounded bg-amber-400 text-black text-center"
                >
                  Ask on Telegram
                </a>
              </div>
            </div>

            {/* Cheat sheet + Journal template + Headway CTA */}
            <div className={PANEL}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-100">
                  <GraduationCap className="w-5 h-5 text-indigo-400" />
                  <div className="font-semibold">Cheat sheet & Journal</div>
                </div>
                <div className="text-xs text-gray-400">Downloads</div>
              </div>

              <p className="mt-2 text-sm text-gray-400">
                One-page checklist and a simple trade journal to track entries, exits & emotions.
              </p>

              <div className="mt-3 flex gap-2">
                <button onClick={downloadCheat} className="flex-1 px-3 py-2 rounded bg-indigo-600 text-white">
                  Download cheat sheet
                </button>
                <button onClick={downloadJournalTemplate} className="flex-1 px-3 py-2 rounded border text-gray-100">
                  Download journal CSV
                </button>
              </div>

              <div className="mt-3">
                <a
                  href={HEADWAY_SIGNUP}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 rounded px-3 py-2 bg-amber-400 text-black font-semibold"
                >
                  Open Headway (min $5 & claim bonuses)
                </a>
                <div className="mt-2 text-xs text-gray-400">
                  New member bonus: <a href={HEADWAY_BONUS} className="underline" target="_blank" rel="noreferrer">Get $111</a>. Gifts: <a href={HEADWAY_GIFTS} className="underline" target="_blank" rel="noreferrer">Giftshop</a>.
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div className={PANEL}>
              <div className="flex items-center gap-2 text-gray-100">
                <Heart className="w-5 h-5 text-rose-400" />
                <div className="font-semibold">Quick links</div>
              </div>

              <div className="mt-3 flex flex-col gap-2 text-sm">
                <a href={YOUTUBE} target="_blank" rel="noreferrer" className="text-gray-100 underline">
                  Video lessons — YouTube
                </a>
                <a href={TELEGRAM} target="_blank" rel="noreferrer" className="text-gray-100 underline">
                  Free setups — Telegram
                </a>
                <a href={HEADWAY_SIGNUP} target="_blank" rel="noreferrer" className="text-gray-100 underline">
                  Headway — Signup & promos
                </a>
                <a href={HEADWAY_DEPOSIT} target="_blank" rel="noreferrer" className="text-gray-100 underline">
                  Deposit bonus details
                </a>
              </div>
            </div>

            <div className="text-center text-xs text-gray-400">
              Need help? Reach out on{" "}
              <a href={TELEGRAM} target="_blank" rel="noreferrer" className="underline">
                Telegram
              </a>
              .
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
