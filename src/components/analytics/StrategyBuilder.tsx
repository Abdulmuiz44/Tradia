"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Brain, Target, ListChecks, Rocket, Filter, Clock, Calendar } from "lucide-react";
import type { Trade } from "@/types/trade";

type PlanTier = "free" | "pro" | "plus" | "elite";

interface Props {
  trades: Trade[];
  plan: PlanTier;
}

function n(v: any, d = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
}

function pct(a: number, b: number) {
  return b === 0 ? 0 : (a / b) * 100;
}

export default function StrategyBuilder({ trades, plan }: Props) {
  const elite = plan === "elite";

  const agg = useMemo(() => {
    const total = trades.length;
    const wins = trades.filter(t => String(t.outcome || '').toLowerCase() === 'win');
    const losses = trades.filter(t => String(t.outcome || '').toLowerCase() === 'loss');
    const pnl = trades.reduce((s, t) => s + n(t.pnl), 0);
    const wr = pct(wins.length, Math.max(1, total));
    const avgWin = wins.length ? wins.reduce((s, t) => s + n(t.pnl), 0) / wins.length : 0;
    const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + n(t.pnl), 0) / losses.length) : 0;
    const pf = avgLoss > 0 ? (Math.abs(avgWin) * wins.length) / (avgLoss * Math.max(1, losses.length)) : wins.length ? Infinity : 0;

    // Symbols
    const bySymbol = new Map<string, { pnl: number; count: number; wins: number }>();
    trades.forEach(t => {
      const sym = (t.symbol || '').toUpperCase();
      const prev = bySymbol.get(sym) || { pnl: 0, count: 0, wins: 0 };
      const isWin = String(t.outcome || '').toLowerCase() === 'win';
      bySymbol.set(sym, { pnl: prev.pnl + n(t.pnl), count: prev.count + 1, wins: prev.wins + (isWin ? 1 : 0) });
    });
    const symRank = Array.from(bySymbol.entries()).map(([sym, v]) => ({ sym, ...v, wr: pct(v.wins, Math.max(1, v.count)) }))
      .sort((a, b) => b.pnl - a.pnl);

    // Weekdays & Hours
    const byWeekday = Array.from({ length: 7 }, () => ({ pnl: 0, count: 0, wins: 0 }));
    const byHour = Array.from({ length: 24 }, () => ({ pnl: 0, count: 0, wins: 0 }));
    trades.forEach(t => {
      const d = new Date(t.closeTime || t.openTime || Date.now());
      const w = d.getDay();
      const h = d.getHours();
      const isWin = String(t.outcome || '').toLowerCase() === 'win';
      byWeekday[w].pnl += n(t.pnl); byWeekday[w].count += 1; byWeekday[w].wins += isWin ? 1 : 0;
      byHour[h].pnl += n(t.pnl); byHour[h].count += 1; byHour[h].wins += isWin ? 1 : 0;
    });

    const bestWeekdayIdx = byWeekday.map((d, i) => ({ i, pnl: d.pnl, wr: pct(d.wins, Math.max(1, d.count)) }))
      .sort((a, b) => b.pnl - a.pnl)[0]?.i ?? null;
    const bestHourIdx = byHour.map((d, i) => ({ i, pnl: d.pnl, wr: pct(d.wins, Math.max(1, d.count)) }))
      .sort((a, b) => b.pnl - a.pnl)[0]?.i ?? null;

    // Rough session buckets by local hour
    const sessionOf = (h: number) => h < 7 ? 'Tokyo' : h < 13 ? 'London' : h < 21 ? 'NewYork' : 'Sydney';
    const bySession = new Map<string, { pnl: number; count: number; wins: number }>();
    byHour.forEach((d, h) => {
      const s = sessionOf(h);
      const prev = bySession.get(s) || { pnl: 0, count: 0, wins: 0 };
      bySession.set(s, { pnl: prev.pnl + d.pnl, count: prev.count + d.count, wins: prev.wins + d.wins });
    });
    const sessionRank = Array.from(bySession.entries()).map(([s, v]) => ({ s, ...v, wr: pct(v.wins, Math.max(1, v.count)) }))
      .sort((a, b) => b.pnl - a.pnl);

    return { total, wr, avgWin, avgLoss, pf, pnl, symRank, byWeekday, byHour, bestWeekdayIdx, bestHourIdx, sessionRank };
  }, [trades]);

  const weekdayNames = useMemo(() => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], []);

  // Candidate rules
  const rules = useMemo(() => {
    const topSyms = agg.symRank.slice(0, 5).map(s => s.sym);
    const goodSessions = agg.sessionRank.filter(s => s.pnl > 0).map(s => s.s);
    const bestWeekday = agg.bestWeekdayIdx != null ? weekdayNames[agg.bestWeekdayIdx] : undefined;
    const bestHour = agg.bestHourIdx != null ? `${agg.bestHourIdx}:00-${agg.bestHourIdx}:59` : undefined;
    const rrTarget = agg.avgLoss > 0 ? Math.max(1.2, Math.abs(agg.avgWin) / agg.avgLoss).toFixed(1) : '1.5';

    return [
      {
        title: "Core Setup",
        bullets: [
          topSyms.length ? `Focus instruments: ${topSyms.join(", ")}` : "Define a 3–5 instrument focus list",
          goodSessions.length ? `Trade sessions: ${goodSessions.join(", ")}` : "Trade London/NewYork overlap only",
          bestWeekday ? `Priority day: ${bestWeekday}` : "Avoid low-liquidity Fridays (if underperforming)",
        ]
      },
      {
        title: "Risk Rules",
        bullets: [
          `Target R:R ≥ ${rrTarget}`,
          "Max 2 consecutive losses; then stop for the day",
          "Daily loss cap: 2% of equity; weekly cap: 5%",
        ]
      },
      {
        title: "Execution",
        bullets: [
          bestHour ? `Primary window: ${bestHour}` : "Trade only during predefined 2–3 hour windows",
          "Enter on confluence: trend + pullback + momentum",
          "Move to BE at +1R; scale out at +2R",
        ]
      },
      {
        title: "Review",
        bullets: [
          "Weekly: prune one weak rule and promote one strong rule",
          "Monthly: re-rank instruments by edge and reweight",
        ]
      }
    ];
  }, [agg, weekdayNames]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold flex items-center gap-2"><Brain className="w-5 h-5 text-yellow-500" /> Strategy Builder</h3>
        <Badge variant="secondary">Elite</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Target className="w-4 h-4 text-emerald-500" /> Edge Hypotheses</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>{agg.symRank[0] ? `Primary edge on ${agg.symRank[0].sym} (WR ${Math.round((agg.symRank[0].wins / Math.max(1, agg.symRank[0].count)) * 100)}%, P&L $${agg.symRank[0].pnl.toFixed(0)})` : 'Identify top instrument by net P&L.'}</li>
            <li>{agg.sessionRank[0] ? `Best session: ${agg.sessionRank[0].s} (WR ${agg.sessionRank[0].wr.toFixed(0)}%)` : 'Determine best session (London/NewYork).'}</li>
            <li>{Number.isFinite(agg.pf) ? `Profit factor ${agg.pf.toFixed(2)} — ${agg.pf >= 1.3 ? 'edge present' : 'needs refinement'}` : 'Profit factor ∞ — very strong edge (small sample?)'}</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ListChecks className="w-4 h-4 text-blue-500" /> Rule Candidates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {rules.map((r, idx) => (
              <div key={idx} className="rounded border border-white/10 p-4">
                <div className="font-medium mb-2">{r.title}</div>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {r.bullets.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Filter className="w-4 h-4 text-purple-500" /> Backtest Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            <li>Define entry/exit criteria precisely (no hindsight).</li>
            <li>Use last 6–12 months; keep recent month out-of-sample.</li>
            <li>Record slippage/fees; evaluate drawdowns and stagnation.</li>
            <li>Compare against baseline (randomized timings) to validate edge.</li>
            <li>Iterate weekly; keep a change log of rule tweaks.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

