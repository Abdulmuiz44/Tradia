"use client";

import React, { useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, Clock, Calendar, Activity } from "lucide-react";
import { format, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import type { Trade } from "@/types/trade";

type PlanTier = "free" | "pro" | "plus" | "elite";

interface Props {
  trades: Trade[];
  plan: PlanTier;
}

function safeNum(n: any, d = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : d;
}

export default function WeeklyCoachRecap({ trades, plan }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const weekly = useMemo(() => {
    const weekTrades = trades.filter((t) => {
      const d = new Date(t.closeTime || t.openTime || Date.now());
      return isWithinInterval(d, { start: weekStart, end: weekEnd });
    });
    const totalTrades = weekTrades.length;
    const wins = weekTrades.filter((t) => String(t.outcome || "").toLowerCase() === "win").length;
    const losses = weekTrades.filter((t) => String(t.outcome || "").toLowerCase() === "loss").length;
    const pnl = weekTrades.reduce((s, t) => s + safeNum(t.pnl), 0);
    const avgWin = (() => {
      const ws = weekTrades.filter((t) => String(t.outcome || "").toLowerCase() === "win");
      return ws.length ? ws.reduce((s, t) => s + safeNum(t.pnl), 0) / ws.length : 0;
    })();
    const avgLoss = (() => {
      const ls = weekTrades.filter((t) => String(t.outcome || "").toLowerCase() === "loss");
      return ls.length ? Math.abs(ls.reduce((s, t) => s + safeNum(t.pnl), 0) / ls.length) : 0;
    })();
    const profitFactor = avgLoss > 0 ? (Math.abs(avgWin) * wins) / (avgLoss * Math.max(1, losses)) : wins > 0 ? Infinity : 0;
    const winRate = totalTrades ? (wins / totalTrades) * 100 : 0;

    // Best/worst day
    const byDay = new Map<string, { pnl: number; count: number }>();
    weekTrades.forEach((t) => {
      const d = new Date(t.closeTime || t.openTime || Date.now());
      const key = d.toISOString().slice(0, 10);
      const prev = byDay.get(key) || { pnl: 0, count: 0 };
      byDay.set(key, { pnl: prev.pnl + safeNum(t.pnl), count: prev.count + 1 });
    });
    const dayStats = Array.from(byDay.entries());
    const bestDay = dayStats.slice().sort((a, b) => b[1].pnl - a[1].pnl)[0];
    const worstDay = dayStats.slice().sort((a, b) => a[1].pnl - b[1].pnl)[0];

    // Symbol heatmap-lite
    const bySymbol = new Map<string, { pnl: number; wins: number; losses: number }>();
    weekTrades.forEach((t) => {
      const sym = (t.symbol || "").toUpperCase();
      const prev = bySymbol.get(sym) || { pnl: 0, wins: 0, losses: 0 };
      const outcome = String(t.outcome || "").toLowerCase();
      bySymbol.set(sym, {
        pnl: prev.pnl + safeNum(t.pnl),
        wins: prev.wins + (outcome === "win" ? 1 : 0),
        losses: prev.losses + (outcome === "loss" ? 1 : 0),
      });
    });
    const topSymbols = Array.from(bySymbol.entries())
      .map(([sym, v]) => ({ sym, ...v, winRate: (v.wins / Math.max(1, v.wins + v.losses)) * 100 }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 5);

    // Simple focus suggestions
    const focus: string[] = [];
    if (winRate < 45 && profitFactor < 1) focus.push("Tighten risk; avoid overtrading and widen quality filters.");
    if (avgLoss > avgWin) focus.push("Improve R:R. Enforce minimum 1.5R setups and earlier exits on losers.");
    if (worstDay && worstDay[1].count > Math.ceil(totalTrades / 3)) focus.push("Concentration risk: spread entries across sessions/instruments.");
    if (topSymbols[0] && topSymbols[0].winRate < 45) focus.push(`Reassess ${topSymbols[0].sym} — low edge this week.`);

    return { weekTrades, totalTrades, wins, losses, pnl, avgWin, avgLoss, profitFactor, winRate, bestDay, worstDay, topSymbols, focus };
  }, [trades, weekStart, weekEnd]);

  const canExport = plan === 'plus' || plan === 'elite';

  const handleExport = () => {
    try {
      const node = containerRef.current;
      if (!node) return;
      const win = window.open('', '_blank');
      if (!win) return;
      const styles = `
        body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, sans-serif; color: #0f172a; }
        h1,h2,h3 { margin: 0; }
        .metric { display: inline-block; padding: 8px 12px; border-radius: 8px; margin: 6px; background: #f1f5f9; }
        .section { margin: 12px 0; }
        .muted { color: #64748b; font-size: 12px; }
      `;
      win.document.write(`<html><head><title>Weekly Coach Recap</title><style>${styles}</style></head><body>`);
      win.document.write(`<h2>Weekly Coach Recap</h2>`);
      win.document.write(node.innerHTML);
      win.document.write('</body></html>');
      win.document.close();
      win.focus();
      win.print();
    } catch {}
  };

  return (
    <div className="space-y-6" ref={containerRef}>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Weekly Coach Recap</h3>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Week {format(weekStart, "wo")} · {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d")}</Badge>
          {canExport && (
            <button onClick={handleExport} className="px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">Export PDF</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Net P&L</div>
            <div className={`text-2xl font-bold ${weekly.pnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>${weekly.pnl.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Win Rate</div>
            <div className="text-2xl font-bold">{weekly.winRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Profit Factor</div>
            <div className="text-2xl font-bold">{Number.isFinite(weekly.profitFactor) ? weekly.profitFactor.toFixed(2) : "∞"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Trades</div>
            <div className="text-2xl font-bold">{weekly.totalTrades}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500" /> Best/Worst Day</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Best</div>
              <div className="font-semibold">{weekly.bestDay ? `${weekly.bestDay[0]} · $${weekly.bestDay[1].pnl.toFixed(2)}` : "—"}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Worst</div>
              <div className="font-semibold">{weekly.worstDay ? `${weekly.worstDay[0]} · $${weekly.worstDay[1].pnl.toFixed(2)}` : "—"}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="w-4 h-4 text-blue-500" /> Focus Areas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              {weekly.focus.length ? weekly.focus.map((f, i) => (
                <li key={i}>{f}</li>
              )) : (
                <li>Solid execution this week. Keep compounding your edge.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Activity className="w-4 h-4 text-purple-500" /> Top Symbols</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {weekly.topSymbols.length ? weekly.topSymbols.map((s) => (
              <div key={s.sym} className="p-3 rounded bg-white/5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{s.sym}</div>
                  <div className="text-xs text-muted-foreground">WR {s.winRate.toFixed(0)}%</div>
                </div>
                <div className={`text-sm font-medium ${s.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>${s.pnl.toFixed(2)}</div>
              </div>
            )) : (
              <div className="text-sm text-muted-foreground">No trades this week.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
