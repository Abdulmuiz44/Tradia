"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, Brain, LineChart as LineChartIcon, BarChart3, Timer, Layers } from "lucide-react";
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

function pct(a: number, b: number) {
  return b === 0 ? 0 : (a / b) * 100;
}

export default function ProInsights({ trades, plan }: Props) {
  const base = useMemo(() => {
    const total = trades.length;
    const wins = trades.filter(t => String(t.outcome || '').toLowerCase() === 'win');
    const losses = trades.filter(t => String(t.outcome || '').toLowerCase() === 'loss');
    const pnl = trades.reduce((s, t) => s + safeNum(t.pnl), 0);
    const avgWin = wins.length ? wins.reduce((s, t) => s + safeNum(t.pnl), 0) / wins.length : 0;
    const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + safeNum(t.pnl), 0) / losses.length) : 0;
    const wr = pct(wins.length, Math.max(1, total));
    const profitFactor = avgLoss > 0 ? (Math.abs(avgWin) * wins.length) / (avgLoss * Math.max(1, losses.length)) : wins.length ? Infinity : 0;
    const expectancy = (wr / 100) * avgWin - ((100 - wr) / 100) * avgLoss;
    const kelly = (() => {
      const b = avgLoss > 0 ? Math.abs(avgWin) / avgLoss : 0;
      const p = wr / 100;
      const q = 1 - p;
      const f = b > 0 ? p - (q / b) : 0;
      return Math.max(0, Math.min(f, 1));
    })();

    // By weekday
    const byWeekday = Array.from({ length: 7 }, () => ({ pnl: 0, count: 0, wins: 0 }));
    trades.forEach(t => {
      const d = new Date(t.closeTime || t.openTime || Date.now());
      const w = d.getDay();
      const outcome = String(t.outcome || '').toLowerCase();
      byWeekday[w].pnl += safeNum(t.pnl);
      byWeekday[w].count += 1;
      byWeekday[w].wins += outcome === 'win' ? 1 : 0;
    });

    // By symbol
    const bySymbol = new Map<string, { pnl: number; count: number; wins: number }>();
    trades.forEach(t => {
      const sym = (t.symbol || '').toUpperCase();
      const prev = bySymbol.get(sym) || { pnl: 0, count: 0, wins: 0 };
      const outcome = String(t.outcome || '').toLowerCase();
      bySymbol.set(sym, { pnl: prev.pnl + safeNum(t.pnl), count: prev.count + 1, wins: prev.wins + (outcome === 'win' ? 1 : 0) });
    });
    const symbolRank = Array.from(bySymbol.entries()).map(([sym, v]) => ({ sym, ...v, wr: pct(v.wins, Math.max(1, v.count)) }))
      .sort((a, b) => b.pnl - a.pnl);

    // Holding time proxy (if duration available)
    const durations = trades.map(t => {
      if (!t.openTime || !t.closeTime) return 0;
      const dt = (new Date(t.closeTime).getTime() - new Date(t.openTime).getTime()) / 60000; // mins
      return Number.isFinite(dt) ? dt : 0;
    }).filter(n => n > 0);
    const avgHold = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    // Session grouping and hour-of-day heat (local time approximation)
    const sessionOf = (h: number) => h < 7 ? 'Tokyo' : h < 13 ? 'London' : h < 21 ? 'NewYork' : 'Sydney';
    const bySession = new Map<string, { pnl: number; count: number; wins: number }>();
    const byHour = Array.from({ length: 24 }, () => ({ pnl: 0, count: 0, wins: 0 }));
    trades.forEach(t => {
      const d = new Date(t.closeTime || t.openTime || Date.now());
      const h = d.getHours();
      const isWin = String(t.outcome || '').toLowerCase() === 'win';
      byHour[h].pnl += safeNum(t.pnl);
      byHour[h].count += 1;
      byHour[h].wins += isWin ? 1 : 0;
      const s = sessionOf(h);
      const prev = bySession.get(s) || { pnl: 0, count: 0, wins: 0 };
      bySession.set(s, { pnl: prev.pnl + safeNum(t.pnl), count: prev.count + 1, wins: prev.wins + (isWin ? 1 : 0) });
    });
    const sessionRank = Array.from(bySession.entries()).map(([s, v]) => ({ s, ...v, wr: pct(v.wins, Math.max(1, v.count)) }))
      .sort((a, b) => b.pnl - a.pnl);

    return { total, wins: wins.length, losses: losses.length, pnl, avgWin, avgLoss, wr, profitFactor, expectancy, kelly, byWeekday, symbolRank, avgHold, sessionRank, byHour };
  }, [trades]);

  const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const eliteOnly = plan === "elite";
  const plusOrElite = plan === "plus" || plan === "elite";
  const proOrAbove = plan === "pro" || plan === "plus" || plan === "elite";

  // Recommendations
  const recs: string[] = [];
  if (base.expectancy < 0) recs.push("Expectancy is negative. Focus on cutting losses faster.");
  if (base.kelly > 0.25) recs.push("High Kelly fraction; consider sizing below Kelly/2 for robustness.");
  if ((base.avgLoss || 0) > Math.abs(base.avgWin) * 1.2) recs.push("Losses bigger than wins; aim for >=1.5R winners.");
  const worstSymbol = base.symbolRank.slice().reverse().find(s => s.count >= 3);
  if (worstSymbol) recs.push(`Reduce exposure to ${worstSymbol.sym} (weak performance).`);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold flex items-center gap-2"><Brain className="w-5 h-5 text-purple-500" /> Pro Insights</h3>
        <Badge variant="secondary">{plan.toUpperCase()}</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Expectancy</div><div className={`text-2xl font-bold ${base.expectancy>=0? 'text-emerald-500':'text-red-500'}`}>${base.expectancy.toFixed(2)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Profit Factor</div><div className="text-2xl font-bold">{Number.isFinite(base.profitFactor)?base.profitFactor.toFixed(2):"∞"}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Kelly Fraction</div><div className="text-2xl font-bold">{(base.kelly*100).toFixed(0)}%</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Avg Hold</div><div className="text-2xl font-bold">{base.avgHold.toFixed(0)}m</div></CardContent></Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-500" /> Weekday Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2 text-center">
              {base.byWeekday.map((d, i) => (
                <div key={i} className="p-2 rounded bg-white/5">
                  <div className="text-xs text-muted-foreground">{weekdayNames[i]}</div>
                  <div className={`text-sm font-medium ${d.pnl>=0? 'text-emerald-500':'text-red-500'}`}>${d.pnl.toFixed(0)}</div>
                  <div className="text-[10px] text-muted-foreground">WR {(pct(d.wins, Math.max(1, d.count))).toFixed(0)}%</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><LineChartIcon className="w-4 h-4 text-emerald-500" /> Instrument Edge</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {base.symbolRank.slice(0, plusOrElite ? 8 : 5).map(s => (
                <div key={s.sym} className="flex items-center justify-between">
                  <div className="text-sm font-medium">{s.sym}</div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm ${s.pnl>=0? 'text-emerald-500':'text-red-500'}`}>${s.pnl.toFixed(0)}</span>
                    <span className="text-xs text-muted-foreground">WR {s.wr.toFixed(0)}% · {s.count}</span>
                  </div>
                </div>
              ))}
              {!base.symbolRank.length && (
                <div className="text-sm text-muted-foreground">No instruments to analyze.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {plusOrElite && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Layers className="w-4 h-4 text-indigo-500" /> Deep Dive: Consistency & Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="p-3 rounded bg-white/5">
                <div className="text-xs text-muted-foreground">Consistency Score</div>
                <div className="text-xl font-semibold">{(() => {
                  const wr = base.wr;
                  const pf = Number.isFinite(base.profitFactor) ? Math.min(base.profitFactor, 3) : 3;
                  const score = Math.min(100, Math.max(0, Math.round(0.6*wr + 0.4*(pf/3)*100)));
                  return `${score}/100`;
                })()}</div>
              </div>
              <div className="p-3 rounded bg-white/5">
                <div className="text-xs text-muted-foreground">Edge Reliability</div>
                <div className="text-xl font-semibold">{(() => {
                  const n = base.total;
                  return n >= 100 ? "High" : n >= 40 ? "Medium" : "Low";
                })()}</div>
              </div>
              <div className="p-3 rounded bg-white/5">
                <div className="text-xs text-muted-foreground">Risk Hint</div>
                <div className="text-sm">{base.kelly > 0.2 ? "Consider sizing <= Kelly/2" : "Sizing conservative; room to scale"}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Timer className="w-4 h-4 text-orange-500" /> Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            {recs.length ? recs.map((r, i) => <li key={i}>{r}</li>) : <li>Edge looks stable. Maintain process and sample size.</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
