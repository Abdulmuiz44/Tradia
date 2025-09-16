"use client";

import { useMemo } from "react";
import { Trade } from "@/types/trade";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ShieldCheck, TrendingDown, CalendarRange, Activity } from "lucide-react";
import { eachDayOfInterval, format, subDays } from "date-fns";

type PlanTier = "free" | "pro" | "plus" | "elite";

interface DailyLossDrawdownGuardProps {
  trades: Trade[];
  plan: PlanTier;
  accountBalance?: number | null;
}

interface GuardSummary {
  recommendedDaily: number;
  recommendedWeekly: number;
  recommendedDrawdown: number;
  worstDay: { value: number; date?: string };
  worstWeek: { value: number; range?: string };
  maxDrawdown: number;
  currentDrawdown: number;
  longestLossStreak: number;
  recentLossStreak: number;
  suggestions: string[];
  breaches: {
    daily: boolean;
    weekly: boolean;
    drawdown: boolean;
    streak: boolean;
  };
  heatmap: Array<{ date: string; pnl: number }>;
}

const PLAN_RULES: Record<PlanTier, { dailyPct: number; weeklyPct: number; maxDrawdownPct: number; lookback: number; autopilot: boolean }> = {
  free: { dailyPct: 0.03, weeklyPct: 0.08, maxDrawdownPct: 0.18, lookback: 21, autopilot: false },
  pro: { dailyPct: 0.025, weeklyPct: 0.07, maxDrawdownPct: 0.14, lookback: 30, autopilot: true },
  plus: { dailyPct: 0.02, weeklyPct: 0.06, maxDrawdownPct: 0.11, lookback: 45, autopilot: true },
  elite: { dailyPct: 0.015, weeklyPct: 0.05, maxDrawdownPct: 0.09, lookback: 60, autopilot: true },
};

const PLAN_RANK: Record<PlanTier, number> = { free: 0, pro: 1, plus: 2, elite: 3 };

function formatCurrency(v: number): string {
  const rounded = Math.round(v * 100) / 100;
  return `${rounded < 0 ? "-" : ""}$${Math.abs(rounded).toLocaleString()}`;
}

function summarizeGuard(trades: Trade[], plan: PlanTier, accountBalance?: number | null): GuardSummary {
  const rules = PLAN_RULES[plan];
  const baseBalance = accountBalance && accountBalance > 0 ? accountBalance : 10000;
  const recommendedDaily = baseBalance * rules.dailyPct;
  const recommendedWeekly = baseBalance * rules.weeklyPct;
  const recommendedDrawdown = baseBalance * rules.maxDrawdownPct;

  const sorted = trades
    .filter((t) => Number.isFinite(Number(t.pnl)) && (t.closeTime || t.openTime))
    .map((t) => ({
      pnl: Number(t.pnl ?? 0),
      lotSize: Number(t.lotSize ?? 0),
      openTime: t.openTime ? new Date(t.openTime) : t.closeTime ? new Date(t.closeTime) : new Date(),
      closeTime: t.closeTime ? new Date(t.closeTime) : t.openTime ? new Date(t.openTime) : new Date(),
    }))
    .sort((a, b) => a.closeTime.getTime() - b.closeTime.getTime());

  const lookbackStart = subDays(new Date(), rules.lookback);
  const days = eachDayOfInterval({ start: lookbackStart, end: new Date() });

  const dayMap = new Map<string, { pnl: number; trades: number; losses: number; wins: number }>();

  for (const day of days) {
    dayMap.set(format(day, "yyyy-MM-dd"), { pnl: 0, trades: 0, losses: 0, wins: 0 });
  }

  sorted.forEach((trade) => {
    const key = format(trade.closeTime ?? trade.openTime, "yyyy-MM-dd");
    const bucket = dayMap.get(key);
    if (!bucket) return;
    bucket.pnl += trade.pnl;
    bucket.trades += 1;
    if (trade.pnl < 0) bucket.losses += 1;
    if (trade.pnl > 0) bucket.wins += 1;
  });

  const dayEntries = Array.from(dayMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  let cumulative = 0;
  let peak = 0;
  let maxDrawdown = 0;
  let currentDrawdown = 0;
  let worstDayValue = 0;
  let worstDayDate: string | undefined;

  const heatmap: Array<{ date: string; pnl: number }> = [];

  dayEntries.forEach(([date, value]) => {
    cumulative += value.pnl;
    if (cumulative > peak) {
      peak = cumulative;
    }
    const drawdown = peak - cumulative;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
    if (date >= format(subDays(new Date(), 7), "yyyy-MM-dd")) {
      heatmap.push({ date, pnl: value.pnl });
    }
    currentDrawdown = drawdown;
    if (value.pnl < worstDayValue) {
      worstDayValue = value.pnl;
      worstDayDate = date;
    }
  });

  let worstWeekValue = 0;
  let worstWeekRange: string | undefined;
  for (let i = 0; i < dayEntries.length; i++) {
    const slice = dayEntries.slice(i, i + 5);
    if (!slice.length) continue;
    const sum = slice.reduce((acc, [, v]) => acc + v.pnl, 0);
    if (sum < worstWeekValue) {
      worstWeekValue = sum;
      const start = slice[0]?.[0];
      const end = slice[slice.length - 1]?.[0];
      worstWeekRange = start && end ? `${start}  -  ${end}` : undefined;
    }
  }

  let streak = 0;
  let longestLossStreak = 0;
  sorted.forEach((trade) => {
    if (trade.pnl < 0) {
      streak += 1;
      if (streak > longestLossStreak) longestLossStreak = streak;
    } else {
      streak = 0;
    }
  });

  const recentLossStreak = sorted.slice(-5).reduce((acc, trade) => (trade.pnl < 0 ? acc + 1 : 0), 0);

  const breaches = {
    daily: Math.abs(worstDayValue) > recommendedDaily,
    weekly: Math.abs(worstWeekValue) > recommendedWeekly,
    drawdown: maxDrawdown > recommendedDrawdown,
    streak: longestLossStreak >= 3,
  };

  const suggestions: string[] = [];
  if (breaches.daily && worstDayDate) {
    suggestions.push(`Lock in a hard stop at ${formatCurrency(recommendedDaily)}. ${worstDayDate} closed at ${formatCurrency(worstDayValue)}.`);
  }
  if (breaches.weekly && worstWeekRange) {
    suggestions.push(`Take a cooldown after ${worstWeekRange}  -  losses totaled ${formatCurrency(worstWeekValue)}.`);
  }
  if (breaches.drawdown) {
    suggestions.push(`Reduce position size until equity recovers ${formatCurrency(maxDrawdown)} drawdown.`);
  }
  if (breaches.streak) {
    suggestions.push(`Back-test the last ${longestLossStreak} losing trades to find rule breaks before the next session.`);
  }
  if (!suggestions.length) {
    suggestions.push("No guard breaches detected. Keep following the plan.");
  }

  return {
    recommendedDaily,
    recommendedWeekly,
    recommendedDrawdown,
    worstDay: { value: worstDayValue, date: worstDayDate },
    worstWeek: { value: worstWeekValue, range: worstWeekRange },
    maxDrawdown,
    currentDrawdown,
    longestLossStreak,
    recentLossStreak,
    suggestions,
    breaches,
    heatmap,
  };
}

export default function DailyLossDrawdownGuard({ trades, plan, accountBalance }: DailyLossDrawdownGuardProps) {
  const summary = useMemo(() => summarizeGuard(trades, plan, accountBalance), [trades, plan, accountBalance]);
  const rules = PLAN_RULES[plan];

  const breachCount = Object.values(summary.breaches).filter(Boolean).length;
  const severityColor = breachCount === 0 ? "text-emerald-400" : breachCount <= 2 ? "text-yellow-400" : "text-red-400";

  const upgrade = () => {
    try {
      (window as unknown as { location?: Location }).location && (window as any).location.assign("/checkout?plan=pro&billing=monthly");
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" /> Daily Loss & Drawdown Guard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary" className={`${severityColor} bg-white/5`}>{breachCount === 0 ? "Stable" : `${breachCount} risk flags`}</Badge>
            <span className="text-sm text-muted-foreground">
              Guard window: last {PLAN_RULES[plan].lookback} days. Auto-lock {rules.autopilot ? "enabled" : "not included on this plan"}.
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border border-white/10 bg-black/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2"><Activity className="w-4 h-4 text-blue-400" /> Daily loss limit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-semibold">{formatCurrency(summary.recommendedDaily)}</div>
                <Progress value={Math.min(100, (Math.abs(summary.worstDay.value) / summary.recommendedDaily) * 100)} />
                <div className="text-xs text-muted-foreground">
                  Worst day {summary.worstDay.date ? format(summary.worstDay.date ? new Date(summary.worstDay.date) : new Date(), "MMM d") : ""}: {formatCurrency(summary.worstDay.value)}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-black/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2"><CalendarRange className="w-4 h-4 text-purple-400" /> Weekly loss cap</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-semibold">{formatCurrency(summary.recommendedWeekly)}</div>
                <Progress value={Math.min(100, (Math.abs(summary.worstWeek.value) / summary.recommendedWeekly) * 100)} />
                <div className="text-xs text-muted-foreground">
                  Heaviest week {summary.worstWeek.range ?? ""}: {formatCurrency(summary.worstWeek.value)}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-black/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2"><TrendingDown className="w-4 h-4 text-red-400" /> Max drawdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-semibold">{formatCurrency(summary.recommendedDrawdown)}</div>
                <Progress value={Math.min(100, (summary.maxDrawdown / summary.recommendedDrawdown) * 100)} />
                <div className="text-xs text-muted-foreground">Peak-to-valley: {formatCurrency(summary.maxDrawdown)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-lg border border-white/10 overflow-hidden">
            <div className="px-4 py-2 bg-white/5 text-xs uppercase tracking-wide text-muted-foreground">Last 7 sessions</div>
            <div className="divide-y divide-white/5">
              {summary.heatmap.length === 0 && (
                <div className="px-4 py-6 text-sm text-muted-foreground">No recent trades yet. Import or sync trades to activate the guard.</div>
              )}
              {summary.heatmap.map((entry) => {
                const breach = entry.pnl < -summary.recommendedDaily * 0.9;
                return (
                  <div key={entry.date} className="px-4 py-3 flex items-center justify-between">
                    <div className="text-sm font-medium">{format(new Date(entry.date), "EEE, MMM d")}</div>
                    <div className={`text-sm font-semibold ${entry.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatCurrency(entry.pnl)}</div>
                    <Badge variant="outline" className={`text-xs ${breach ? "text-red-400 border-red-500/60" : "text-muted-foreground"}`}>
                      {breach ? "Cooldown" : "Within plan"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 p-4 bg-black/30">
            <div className="flex items-center gap-2 text-sm font-semibold mb-2"><AlertTriangle className="w-4 h-4 text-yellow-400" /> Action plan</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {summary.suggestions.map((suggestion, idx) => (
                <li key={idx} className="leading-relaxed">{suggestion}</li>
              ))}
            </ul>
          </div>

          {PLAN_RANK[plan] === 0 && (
            <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm text-yellow-200">
              <div className="font-semibold mb-1">Upgrade to activate automatic guardrails</div>
              <p>
                Starter plans rely on manual discipline. Upgrade to PRO or higher to unlock auto cool-downs, SMS breach alerts and broker-side kill switches.
              </p>
              <Button size="sm" variant="outline" className="mt-3 border-yellow-500 text-yellow-200" onClick={upgrade}>
                Upgrade for smart guardrails
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

