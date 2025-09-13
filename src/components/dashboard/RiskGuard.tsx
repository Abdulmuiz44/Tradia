"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTrade } from "@/context/TradeContext";
import { useUser } from "@/context/UserContext";
import { Shield, Coffee, AlertTriangle, Settings } from "lucide-react";

type RiskControls = {
  maxDailyLossUSD: number | null;
  maxTradesPerDay: number | null;
  breakAfterConsecutiveLosses: number | null;
  enforceBlocks: boolean; // if true, show a stronger stop banner
};

function loadDefaultsForPlan(plan: string): RiskControls {
  // basic sensible defaults per plan
  switch (plan) {
    case "elite":
      return { maxDailyLossUSD: 150, maxTradesPerDay: 10, breakAfterConsecutiveLosses: 3, enforceBlocks: true };
    case "pro":
      return { maxDailyLossUSD: 100, maxTradesPerDay: 8, breakAfterConsecutiveLosses: 3, enforceBlocks: true };
    case "plus":
      return { maxDailyLossUSD: 50, maxTradesPerDay: 6, breakAfterConsecutiveLosses: 3, enforceBlocks: false };
    default:
      return { maxDailyLossUSD: 25, maxTradesPerDay: 4, breakAfterConsecutiveLosses: 3, enforceBlocks: false };
  }
}

export default function RiskGuard(): React.ReactElement | null {
  const { trades } = useTrade();
  const { plan } = useUser();

  const [controls, setControls] = useState<RiskControls>(() => {
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("riskControls");
        if (raw) return { ...loadDefaultsForPlan("free"), ...(JSON.parse(raw) as RiskControls) };
      }
    } catch {}
    return loadDefaultsForPlan(plan);
  });

  useEffect(() => {
    // if no saved settings, refresh defaults when plan changes
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("riskControls");
        if (!raw) setControls(loadDefaultsForPlan(plan));
      }
    } catch {}
  }, [plan]);

  useEffect(() => {
    try { if (typeof window !== "undefined") localStorage.setItem("riskControls", JSON.stringify(controls)); } catch {}
  }, [controls]);

  const today = useMemo(() => new Date(), []);
  const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const todayTrades = useMemo(() => {
    return trades.filter((t) => {
      const d = new Date((t as any).openTime || (t as any).open_time || (t as any).created_at || 0);
      return !isNaN(d.getTime()) && isSameDay(d, today);
    });
  }, [trades, today]);

  const stats = useMemo(() => {
    const count = todayTrades.length;
    const pnl = todayTrades.reduce((s, t) => s + (Number((t as any).pnl) || 0), 0);
    // compute current consecutive losses
    let consecLoss = 0;
    for (let i = trades.length - 1; i >= 0; i--) {
      const p = Number((trades[i] as any).pnl) || 0;
      if (p < 0) consecLoss++; else break;
    }
    return { count, pnl, consecLoss };
  }, [todayTrades, trades]);

  const breaches = useMemo(() => {
    const b: string[] = [];
    if (controls.maxDailyLossUSD != null && stats.pnl <= -Math.abs(controls.maxDailyLossUSD)) {
      b.push(`Daily loss limit reached ($${Math.abs(stats.pnl).toFixed(2)})`);
    }
    if (controls.maxTradesPerDay != null && stats.count >= controls.maxTradesPerDay) {
      b.push(`Max trades per day reached (${stats.count}/${controls.maxTradesPerDay})`);
    }
    if (controls.breakAfterConsecutiveLosses != null && stats.consecLoss >= controls.breakAfterConsecutiveLosses) {
      b.push(`${stats.consecLoss} consecutive losses — take a break`);
    }
    return b;
  }, [controls, stats]);

  const [dismissed, setDismissed] = useState(false);
  useEffect(() => setDismissed(false), [stats.pnl, stats.count, stats.consecLoss]);

  if (breaches.length === 0 || dismissed) return null;

  const strong = controls.enforceBlocks && (plan === "pro" || plan === "elite");

  return (
    <div className={`mb-4 rounded-xl border ${strong ? 'border-red-600 bg-red-900/20' : 'border-yellow-600 bg-yellow-900/20'} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {strong ? <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" /> : <Shield className="h-5 w-5 text-yellow-400 mt-0.5" />}
          <div>
            <div className="font-semibold text-white">Risk Guard</div>
            <ul className="mt-1 text-sm text-zinc-200 list-disc pl-5">
              {breaches.map((m, i) => (<li key={i}>{m}</li>))}
            </ul>
            <div className="mt-2 text-xs text-zinc-400">Tip: Step away for 10 minutes, review your checklist, and return with a calm mind.</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDismissed(true)}
            className="px-3 py-1.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700"
            title="Snooze"
          >
            Snooze
          </button>
          <a
            href="/dashboard/settings"
            className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center gap-1"
          >
            <Settings className="h-4 w-4" />
            Adjust
          </a>
          <button
            onClick={() => alert('Break started. Timer: 10 minutes. Use this time to reset.')} 
            className="px-3 py-1.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700 inline-flex items-center gap-1"
          >
            <Coffee className="h-4 w-4" />
            Take Break
          </button>
        </div>
      </div>
    </div>
  );
}

