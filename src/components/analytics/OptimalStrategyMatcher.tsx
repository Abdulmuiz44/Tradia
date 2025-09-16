"use client";

import { useMemo } from "react";
import { Trade } from "@/types/trade";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Compass, Layers, Lightbulb, Sparkles, Trophy } from "lucide-react";

type PlanTier = "free" | "pro" | "plus" | "elite";

interface OptimalStrategyMatcherProps {
  trades: Trade[];
  plan: PlanTier;
}

interface StrategySummary {
  name: string;
  pnl: number;
  winRate: number;
  trades: number;
}

interface SessionSummary {
  name: string;
  pnl: number;
  trades: number;
}

function summarizeStrategies(trades: Trade[]): StrategySummary[] {
  const map = new Map<string, { pnl: number; wins: number; trades: number }>();
  trades.forEach((trade) => {
    const key = (trade.strategy && trade.strategy.trim()) || "Untitled";
    const entry = map.get(key) ?? { pnl: 0, wins: 0, trades: 0 };
    entry.pnl += Number(trade.pnl ?? 0);
    entry.trades += 1;
    if (String(trade.outcome).toLowerCase() === "win") entry.wins += 1;
    map.set(key, entry);
  });

  return Array.from(map.entries()).map(([name, value]) => ({
    name,
    pnl: value.pnl,
    trades: value.trades,
    winRate: value.trades === 0 ? 0 : (value.wins / value.trades) * 100,
  }));
}

function summarizeSessions(trades: Trade[]): SessionSummary[] {
  const map = new Map<string, { pnl: number; trades: number }>();
  trades.forEach((trade) => {
    const key = (trade.session && trade.session.trim()) || "Unlabeled";
    const entry = map.get(key) ?? { pnl: 0, trades: 0 };
    entry.pnl += Number(trade.pnl ?? 0);
    entry.trades += 1;
    map.set(key, entry);
  });

  return Array.from(map.entries()).map(([name, value]) => ({ name, pnl: value.pnl, trades: value.trades }));
}

function nextPlan(plan: PlanTier): PlanTier {
  if (plan === "free") return "pro";
  if (plan === "pro") return "plus";
  if (plan === "plus") return "elite";
  return "elite";
}

export default function OptimalStrategyMatcher({ trades, plan }: OptimalStrategyMatcherProps) {
  const { strategies, sessions } = useMemo(() => {
    return {
      strategies: summarizeStrategies(trades),
      sessions: summarizeSessions(trades),
    };
  }, [trades]);

  const sortedByPnl = [...strategies].sort((a, b) => b.pnl - a.pnl);
  const sortedByWinRate = [...strategies].sort((a, b) => b.winRate - a.winRate);

  const bestProfit = sortedByPnl[0];
  const bestWinRate = sortedByWinRate[0];
  const focusStrategy = bestProfit ?? bestWinRate;
  const diversificationScore = strategies.length > 1 ? Math.min(100, Math.round((strategies.length / 5) * 100)) : 20;

  const recommendations: Array<{ title: string; detail: string }> = [];
  if (focusStrategy) {
    recommendations.push({
      title: `Scale ${focusStrategy.name}`,
      detail: `${focusStrategy.winRate.toFixed(1)}% win rate across ${focusStrategy.trades} trades with ${focusStrategy.pnl >= 0 ? "$" : "-$"}${Math.abs(focusStrategy.pnl).toFixed(2)} net P/L.`,
    });
  }
  if (bestProfit && bestWinRate && bestProfit.name !== bestWinRate.name) {
    recommendations.push({
      title: "Split exposure",
      detail: `${bestProfit.name} leads by profit while ${bestWinRate.name} holds the best accuracy. Allocate risk between both setups to steady the curve.`,
    });
  }
  if (diversificationScore < 60) {
    recommendations.push({
      title: "Add diversity",
      detail: "Introduce a secondary setup or timeframe to keep equity swings under control.",
    });
  }
  if (sessions.length > 0) {
    const bestSession = [...sessions].sort((a, b) => b.pnl - a.pnl)[0];
    if (bestSession) {
      recommendations.push({
        title: `Focus on ${bestSession.name}`,
        detail: `${bestSession.trades} trades logged with ${bestSession.pnl >= 0 ? "$" : "-$"}${Math.abs(bestSession.pnl).toFixed(2)} aggregate P/L.`,
      });
    }
  }

  const upgradePlan = nextPlan(plan);
  const upgradeCopy = plan === "free"
    ? "Upgrade to PRO to unlock AI setup scoring, risk tags, and one-click journaling."
    : plan === "pro"
      ? "PLUS adds multi-strategy overlays, AI edge heatmaps, and session guardrails."
      : plan === "plus"
        ? "ELITE unlocks automation, multi-account syncing, and live allocation coaching."
        : "You already have every strategy matcher feature unlocked.";

  const handleUpgrade = () => {
    if (plan === "elite") return;
    try {
      (window as any).location.assign(`/checkout?plan=${upgradePlan}&billing=monthly`);
    } catch {
      // ignore navigation errors
    }
  };

  return (
    <Card className="border border-white/10 bg-black/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-emerald-300" /> Optimal Strategy Matcher
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {!trades.length && (
          <div className="text-sm text-muted-foreground">
            Import trades to let Tradia map out your strategy strengths and quick wins.
          </div>
        )}

        {focusStrategy && (
          <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Trophy className="w-4 h-4" /> Featured setup
            </div>
            <div className="mt-2 text-lg font-semibold">{focusStrategy.name}</div>
            <div className="text-xs text-emerald-100 mt-1">
              {focusStrategy.trades} trades | {focusStrategy.winRate.toFixed(1)}% win rate | {focusStrategy.pnl >= 0 ? "+" : "-"}${Math.abs(focusStrategy.pnl).toFixed(2)} P/L
            </div>
          </div>
        )}

        {strategies.length > 0 && (
          <div className="grid md:grid-cols-2 gap-3">
            {sortedByPnl.slice(0, 4).map((strategy) => (
              <div key={strategy.name} className="rounded-lg border border-white/10 bg-black/20 p-3 space-y-1">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>{strategy.name}</span>
                  <Badge variant="outline" className="text-xs bg-white/5">
                    {strategy.pnl >= 0 ? "+" : "-"}${Math.abs(strategy.pnl).toFixed(2)}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {strategy.trades} trades | {strategy.winRate.toFixed(1)}% win rate
                </div>
              </div>
            ))}
          </div>
        )}

        {sessions.length > 0 && (
          <div className="rounded-lg border border-white/10 bg-black/20 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Layers className="w-4 h-4 text-blue-300" /> Session breakdown
            </div>
            {sessions.map((session) => (
              <div key={session.name} className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{session.name}</span>
                <span className={`font-medium ${session.pnl >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                  {session.pnl >= 0 ? "+" : "-"}${Math.abs(session.pnl).toFixed(2)}
                </span>
                <Badge variant="outline" className="text-[10px] bg-white/5">
                  {session.trades} trades
                </Badge>
              </div>
            ))}
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 font-semibold mb-2">
              <Lightbulb className="w-4 h-4 text-yellow-300" /> AI playbook
            </div>
            <ul className="space-y-2 list-disc pl-5">
              {recommendations.map((rec, index) => (
                <li key={index}>
                  <span className="font-semibold">{rec.title}.</span> {rec.detail}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-lg border border-purple-500/40 bg-purple-500/10 p-4 text-sm text-purple-100">
          <div className="flex items-center gap-2 font-semibold mb-2">
            <Sparkles className="w-4 h-4" /> Plan intelligence
          </div>
          <p className="mb-3">{upgradeCopy}</p>
          {plan !== "elite" && (
            <Button size="sm" variant="outline" className="border-purple-400 text-purple-100" onClick={handleUpgrade}>
              Upgrade for deeper insights
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
