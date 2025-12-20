"use client";

import { useMemo } from "react";
import { Trade } from "@/types/trade";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, CheckCircle, Flag, Shield, Target, TrendingDown, TrendingUp } from "lucide-react";
import { format } from "date-fns";

type PlanTier = "starter" | "pro" | "plus" | "elite";

type PropFirmDashboardProps = {
  trades: Trade[];
  plan: PlanTier;
  accountBalance?: number | null;
};

interface ChallengeProfile {
  label: string;
  targetPct: number;
  dailyLossPct: number;
  maxDrawdownPct: number;
  phaseDays: number;
  phaseCount: number;
}

const DEFAULT_BALANCE = 100000;

const CHALLENGE_BY_PLAN: Record<PlanTier, ChallengeProfile> = {
  starter: { label: "Evaluation Mode", targetPct: 0.1, dailyLossPct: 0.05, maxDrawdownPct: 0.1, phaseDays: 30, phaseCount: 1 },
  pro: { label: "50k Evaluation", targetPct: 0.08, dailyLossPct: 0.045, maxDrawdownPct: 0.09, phaseDays: 30, phaseCount: 2 },
  plus: { label: "100k Evaluation", targetPct: 0.1, dailyLossPct: 0.04, maxDrawdownPct: 0.08, phaseDays: 35, phaseCount: 2 },
  elite: { label: "200k Funding Sprint", targetPct: 0.12, dailyLossPct: 0.035, maxDrawdownPct: 0.07, phaseDays: 40, phaseCount: 2 },
};

function formatCurrency(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return `${rounded < 0 ? "-" : ""}$${Math.abs(rounded).toLocaleString()}`;
}

export default function PropFirmDashboard({ trades, plan, accountBalance }: PropFirmDashboardProps) {
  const profile = CHALLENGE_BY_PLAN[plan];
  const baseBalance = accountBalance && accountBalance > 0 ? accountBalance : DEFAULT_BALANCE;

  const metrics = useMemo(() => {
    const sorted = [...trades]
      .filter((trade) => Number.isFinite(Number(trade.pnl)))
      .sort((a, b) => {
        const aDate = new Date(a.closeTime ?? a.openTime ?? 0);
        const bDate = new Date(b.closeTime ?? b.openTime ?? 0);
        return aDate.getTime() - bDate.getTime();
      });

    let cumulative = 0;
    let peak = 0;
    let maxDrawdown = 0;
    const dailyMap = new Map<string, number>();

    sorted.forEach((trade) => {
      const pnl = Number(trade.pnl ?? 0);
      cumulative += pnl;
      if (cumulative > peak) peak = cumulative;
      const drawdown = peak - cumulative;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;

      const date = trade.closeTime || trade.openTime;
      if (date) {
        const key = new Date(date).toISOString().slice(0, 10);
        dailyMap.set(key, (dailyMap.get(key) ?? 0) + pnl);
      }
    });

    const target = baseBalance * profile.targetPct;
    const maxDailyLoss = baseBalance * profile.dailyLossPct;
    const maxTotalLoss = baseBalance * profile.maxDrawdownPct;
    const progressPct = target === 0 ? 0 : Math.min(100, Math.max(0, (cumulative / target) * 100));

    let largestDayLoss = 0;
    let largestDayGain = 0;
    let breachDays = 0;

    dailyMap.forEach((pnl, day) => {
      if (pnl < largestDayLoss) largestDayLoss = pnl;
      if (pnl > largestDayGain) largestDayGain = pnl;
      if (Math.abs(pnl) > maxDailyLoss) breachDays += 1;
    });

    const daysTraded = dailyMap.size;
    const pass = cumulative >= target && breachDays === 0 && maxDrawdown <= maxTotalLoss;
    const riskState = breachDays > 0 || maxDrawdown > maxTotalLoss ? "at-risk" : progressPct >= 70 ? "close" : "on-track";

    return {
      cumulative,
      target,
      maxDailyLoss,
      maxTotalLoss,
      progressPct,
      largestDayLoss,
      largestDayGain,
      breachDays,
      daysTraded,
      maxDrawdown,
      riskState,
      pass,
      trailingDaily: Array.from(dailyMap.entries()).slice(-10),
    };
  }, [trades, baseBalance, profile]);

  const complianceItems = [
    {
      label: "Profit target",
      value: `${formatCurrency(metrics.cumulative)} / ${formatCurrency(metrics.target)}`,
      ok: metrics.cumulative >= metrics.target,
    },
    {
      label: "Daily loss limit",
      value: `${formatCurrency(metrics.largestDayLoss)} (cap ${formatCurrency(-metrics.maxDailyLoss)})`,
      ok: metrics.largestDayLoss >= -metrics.maxDailyLoss,
    },
    {
      label: "Max drawdown",
      value: `${formatCurrency(metrics.maxDrawdown)} (cap ${formatCurrency(metrics.maxTotalLoss)})`,
      ok: metrics.maxDrawdown <= metrics.maxTotalLoss,
    },
    {
      label: "Rule breaches",
      value: `${metrics.breachDays} days over limit`,
      ok: metrics.breachDays === 0,
    },
  ];

  const riskBadge = metrics.riskState === "at-risk" ? "bg-red-500/10 text-red-300 border border-red-500/40"
    : metrics.riskState === "close" ? "bg-yellow-500/10 text-yellow-200 border border-yellow-500/40"
    : "bg-emerald-500/10 text-emerald-200 border border-emerald-500/40";

  const upgradePath = plan === "starter" ? "pro" : plan === "pro" ? "plus" : plan === "plus" ? "elite" : "elite";

  const upgrade = () => {
    try {
      (window as any).location.assign(`/checkout?plan=${upgradePath}&billing=monthly`);
    } catch {
      // ignore
    }
  };

  return (
    <Card className="border border-white/10 bg-black/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-400" /> Prop Firm Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className={`text-xs px-3 py-1 ${riskBadge}`}>{profile.label}</Badge>
          <div className="text-sm text-muted-foreground">
            {metrics.pass ? "Challenge passed" : metrics.riskState === "at-risk" ? "Risk of violation" : "Within evaluation guardrails"}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-black/20 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-300" />
              <span className="text-sm font-semibold">Phase progress</span>
            </div>
            <div className="text-2xl font-bold">{metrics.progressPct.toFixed(0)}%</div>
            <Progress value={metrics.progressPct} className="h-2" />
            <div className="text-xs text-muted-foreground">
              {formatCurrency(metrics.cumulative)} closed vs {formatCurrency(metrics.target)} target
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/20 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-emerald-300" />
              <span className="text-sm font-semibold">Days traded</span>
            </div>
            <div className="text-2xl font-bold">{metrics.daysTraded} / {profile.phaseDays}</div>
            <div className="text-xs text-muted-foreground">
              Complete at least {Math.ceil(profile.phaseDays * 0.4)} active days per phase
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-white/10">
          <div className="px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground bg-white/5">Rule compliance</div>
          <div className="divide-y divide-white/5">
            {complianceItems.map((item) => (
              <div key={item.label} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2">
                  {item.ok ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
                  <span className="font-medium">{item.label}</span>
                </div>
                <span className={`font-semibold ${item.ok ? "text-emerald-300" : "text-red-300"}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/20 p-4 space-y-2">
          <div className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-300" /> Recent daily performance
          </div>
          {metrics.trailingDaily.length === 0 && (
            <div className="text-xs text-muted-foreground">No trades recorded yet.</div>
          )}
          <div className="grid gap-2">
            {metrics.trailingDaily.map(([day, pnl]) => (
              <div key={day} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{format(new Date(day), "MMM d")}</span>
                <span className={`font-medium ${pnl >= 0 ? "text-emerald-300" : "text-red-300"}`}>{formatCurrency(pnl)}</span>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide bg-white/5">
                  {Math.abs(pnl) > metrics.maxDailyLoss ? "Breach" : "Within limit"}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 p-4 bg-white/5 text-sm text-muted-foreground">
          <div className="font-semibold mb-1">Coach notes</div>
          <ul className="list-disc list-inside space-y-1">
            <li>Lock in progress with reduced risk once you reach 80% of the target.</li>
            <li>Keep daily loss under {formatCurrency(metrics.maxDailyLoss)} to avoid resets.</li>
            <li>Book at least {profile.phaseCount} journal reviews before phase completion.</li>
          </ul>
        </div>

        {plan !== "elite" && (
          <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 p-4 text-sm text-blue-100">
            <div className="font-semibold flex items-center gap-2 mb-1"><ArrowUpRight className="w-4 h-4" /> Unlock elite prop automations</div>
            <p className="mb-3">Elite adds auto-sync with challenge dashboards, breach SMS alerts, and multi-phase tracking.</p>
            <Button size="sm" variant="outline" className="border-blue-400 text-blue-100" onClick={upgrade}>
              Upgrade for elite prop toolkit
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
