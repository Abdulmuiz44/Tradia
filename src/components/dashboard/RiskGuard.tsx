"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useTrade } from "@/context/TradeContext";
import { useUser } from "@/context/UserContext";
import { Shield, Coffee, AlertTriangle, Settings, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTradingRules, updateTradingRules } from "@/lib/supabase-utils";
import { toast } from "sonner";

type RiskControls = {
  daily_drawdown_limit_pct: number;
  max_drawdown_limit_pct: number;
  max_trades_per_day: number;
  enforce_halt: boolean;
  starting_equity: number;
  prop_firm_preset: string | null;
};

const DEFAULT_RULES: RiskControls = {
  daily_drawdown_limit_pct: 1.0,
  max_drawdown_limit_pct: 5.0,
  max_trades_per_day: 5,
  enforce_halt: false,
  starting_equity: 0,
  prop_firm_preset: null,
};

export default function RiskGuard(): React.ReactElement | null {
  const { trades } = useTrade();
  const { user, plan } = useUser();

  const [controls, setControls] = useState<RiskControls>(DEFAULT_RULES);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Fetch rules from Supabase
  const fetchRules = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await getTradingRules(user.id);
      if (data) {
        setControls({
          daily_drawdown_limit_pct: Number(data.daily_drawdown_limit_pct) || DEFAULT_RULES.daily_drawdown_limit_pct,
          max_drawdown_limit_pct: Number(data.max_drawdown_limit_pct) || DEFAULT_RULES.max_drawdown_limit_pct,
          max_trades_per_day: Number(data.max_trades_per_day) || DEFAULT_RULES.max_trades_per_day,
          enforce_halt: Boolean(data.enforce_halt),
          starting_equity: Number(data.starting_equity) || 0,
          prop_firm_preset: data.prop_firm_preset || null,
        });
      }
    } catch (err) {
      console.error("Failed to fetch risk rules:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

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
    const pnlUSD = todayTrades.reduce((s, t) => s + (Number((t as any).pnl) || 0), 0);

    // Total max drawdown calculation (simplified for here)
    let peak = controls.starting_equity || 0;
    let currentEquity = peak;
    let maxDrawdownUSD = 0;

    // Sort trades by date for historical DD calculation
    const sortedTrades = [...trades].sort((a, b) =>
      new Date((a as any).openTime || 0).getTime() - new Date((b as any).openTime || 0).getTime()
    );

    for (const t of sortedTrades) {
      currentEquity += (Number((t as any).pnl) || 0);
      if (currentEquity > peak) peak = currentEquity;
      const dd = peak - currentEquity;
      if (dd > maxDrawdownUSD) maxDrawdownUSD = dd;
    }

    // Consecutive losses
    let consecLoss = 0;
    for (let i = trades.length - 1; i >= 0; i--) {
      const p = Number((trades[i] as any).pnl) || 0;
      if (p < 0) consecLoss++; else if (p > 0) break;
    }

    return { count, pnlUSD, maxDrawdownUSD, currentEquity, consecLoss };
  }, [todayTrades, trades, controls.starting_equity]);

  const breaches = useMemo(() => {
    const b: string[] = [];
    const equity = controls.starting_equity || stats.currentEquity || 1000; // fallback if no equity

    const dailyLossPct = (Math.abs(Math.min(0, stats.pnlUSD)) / equity) * 100;
    const totalMaxDDPct = (stats.maxDrawdownUSD / (controls.starting_equity || stats.currentEquity || 1)) * 100;

    if (dailyLossPct >= controls.daily_drawdown_limit_pct) {
      b.push(`Daily loss limit reached (${dailyLossPct.toFixed(2)}% / ${controls.daily_drawdown_limit_pct}%)`);
    }
    if (totalMaxDDPct >= controls.max_drawdown_limit_pct) {
      b.push(`Max drawdown limit reached (${totalMaxDDPct.toFixed(2)}% / ${controls.max_drawdown_limit_pct}%)`);
    }
    if (stats.count >= controls.max_trades_per_day) {
      b.push(`Max trades/day reached (${stats.count}/${controls.max_trades_per_day})`);
    }
    if (stats.consecLoss >= 3) {
      b.push(`${stats.consecLoss} consecutive losses — pause and reset.`);
    }
    return b;
  }, [controls, stats]);

  useEffect(() => setDismissed(false), [breaches.length]);

  if (loading || breaches.length === 0 || dismissed) return null;

  const isHaltEnforced = controls.enforce_halt && (plan === "pro" || plan === "elite");

  return (
    <div className={`mb-6 rounded-2xl border ${isHaltEnforced ? 'border-red-500 bg-red-950/20' : 'border-amber-500 bg-amber-950/20'} p-5 backdrop-blur-md shadow-lg animate-in fade-in slide-in-from-top-4 duration-500`}>
      <div className="flex flex-col md:flex-row items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${isHaltEnforced ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
            {isHaltEnforced ? <AlertTriangle className="h-6 w-6" /> : <Shield className="h-6 w-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">Risk Guard Alert</h3>
              {controls.prop_firm_preset && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 uppercase font-bold border border-blue-500/30">
                  {controls.prop_firm_preset} Active
                </span>
              )}
            </div>
            <ul className="mt-2 space-y-1">
              {breaches.map((m, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-zinc-200">
                  <div className={`h-1.5 w-1.5 rounded-full ${isHaltEnforced ? 'bg-red-400' : 'bg-amber-400'}`} />
                  {m}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-zinc-400 font-medium italic">
              "System: Protect your capital. Markets will be here tomorrow."
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
          <Button
            onClick={() => setDismissed(true)}
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-white"
          >
            Snooze
          </Button>
          <Button
            onClick={() => window.location.href = '/dashboard/settings'}
            variant="secondary"
            size="sm"
            className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
          >
            <Settings className="h-4 w-4 mr-2" />
            Adjust Rules
          </Button>
          <Button
            onClick={() => toast.success('Break session started! Rest for 15 minutes.')}
            className={`${isHaltEnforced ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'} text-white shadow-lg`}
            size="sm"
          >
            <Coffee className="h-4 w-4 mr-2" />
            Take Mandatory Break
          </Button>
        </div>
      </div>
    </div>
  );
}

