"use client";

import React, { useMemo } from "react";
import { useTrade } from "@/context/TradeContext";
import { useUser } from "@/context/UserContext";
import FeatureLock from "@/components/FeatureLock";
import { CalendarDays, TrendingDown, TrendingUp, Target } from "lucide-react";

function sum(nums: number[]) { return nums.reduce((a, b) => a + b, 0); }

export default function WeeklyCoachRecap(): React.ReactElement {
  const { trades = [] } = useTrade();
  const { plan } = useUser();

  const range = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const ts = trades.filter((t: any) => {
      const d = new Date(t.openTime || t.open_time || t.created_at || 0);
      return !isNaN(d.getTime()) && d >= start && d <= now;
    });
    const wins = ts.filter((t: any) => Number(t.pnl || 0) > 0);
    const losses = ts.filter((t: any) => Number(t.pnl || 0) < 0);
    const net = sum(ts.map((t: any) => Number(t.pnl || 0)));
    const wr = ts.length ? Math.round((wins.length / ts.length) * 100) : 0;
    const avgWin = wins.length ? Math.round(sum(wins.map((t: any) => Number(t.pnl))) / wins.length) : 0;
    const avgLoss = losses.length ? Math.round(sum(losses.map((t: any) => Math.abs(Number(t.pnl)))) / losses.length) : 0;
    return { ts, wins: wins.length, losses: losses.length, net, wr, avgWin, avgLoss };
  }, [trades]);

  const base = (
    <div className="rounded-xl p-4 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
      <div className="flex items-center gap-2 text-sm"><CalendarDays className="h-4 w-4" /> Weekly Coach Recap</div>
      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="rounded-lg p-3 bg-gray-50 dark:bg-white/5">
          <div className="text-xs text-gray-500 dark:text-gray-400">Win rate</div>
          <div className="font-semibold">{range.wr}%</div>
        </div>
        <div className="rounded-lg p-3 bg-gray-50 dark:bg-white/5">
          <div className="text-xs text-gray-500 dark:text-gray-400">Net P/L</div>
          <div className={`font-semibold ${range.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{range.net}</div>
        </div>
        <div className="rounded-lg p-3 bg-gray-50 dark:bg-white/5">
          <div className="text-xs text-gray-500 dark:text-gray-400">Avg win</div>
          <div className="font-semibold text-green-600 dark:text-green-400">{range.avgWin}</div>
        </div>
        <div className="rounded-lg p-3 bg-gray-50 dark:bg-white/5">
          <div className="text-xs text-gray-500 dark:text-gray-400">Avg loss</div>
          <div className="font-semibold text-red-600 dark:text-red-400">-{range.avgLoss}</div>
        </div>
      </div>
    </div>
  );

  const pro = (
    <div className="rounded-xl p-4 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
      <div className="font-semibold flex items-center gap-2"><Target className="h-4 w-4" /> Pro Insights</div>
      <ul className="mt-2 text-sm list-disc pl-5 text-gray-700 dark:text-gray-300">
        <li>Focus on your best setup: maintain risk ≤ 1–2% per trade</li>
        <li>Plan 3 improvements for next week (entries, sizing, exits)</li>
      </ul>
    </div>
  );

  return (
    <div className="space-y-3">
      {base}
      <FeatureLock requiredPlan="pro">
        {pro}
      </FeatureLock>
    </div>
  );
}

