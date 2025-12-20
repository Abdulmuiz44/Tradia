"use client";

import { useMemo } from "react";
import { Trade } from "@/types/trade";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Brain, Flame, Gauge, Moon, Timer, TrendingUp } from "lucide-react";
import { differenceInMinutes } from "date-fns";

type PlanTier = "starter" | "pro" | "plus" | "elite";

type Severity = "low" | "medium" | "high";

interface TiltModeDetectorProps {
  trades: Trade[];
  plan: PlanTier;
}

interface TiltSignal {
  id: string;
  title: string;
  severity: Severity;
  message: string;
  evidence: string;
}

const SEVERITY_WEIGHT: Record<Severity, number> = { low: 1, medium: 2, high: 3 };

const NEGATIVE_EMOTIONS = ["angry", "fear", "frustrated", "revenge", "tilt", "fatigue"];

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function TiltModeDetector({ trades, plan }: TiltModeDetectorProps) {
  const signals = useMemo<TiltSignal[]>(() => {
    if (!trades.length) {
      return [
        {
          id: "no-data",
          title: "No trades imported yet",
          severity: "low",
          message: "Sync or import trades to activate the tilt detector.",
          evidence: "",
        },
      ];
    }

    const sorted = [...trades]
      .filter((trade) => Number.isFinite(Number(trade.pnl)))
      .sort((a, b) => {
        const aDate = parseDate(a.closeTime) ?? parseDate(a.openTime) ?? new Date();
        const bDate = parseDate(b.closeTime) ?? parseDate(b.openTime) ?? new Date();
        return aDate.getTime() - bDate.getTime();
      });

    const recent = sorted.slice(-15);

    let longestLossStreak = 0;
    let currentStreak = 0;
    let revengeSpikes = 0;
    let paceBursts = 0;
    let overnightTrades = 0;
    let negativeEmotionCount = 0;

    recent.forEach((trade, index) => {
      const pnl = Number(trade.pnl ?? 0);
      if (pnl < 0) {
        currentStreak += 1;
        if (currentStreak > longestLossStreak) longestLossStreak = currentStreak;
      } else {
        currentStreak = 0;
      }

      if (pnl < 0 && index < recent.length - 1) {
        const next = recent[index + 1];
        const thisLot = Number(trade.lotSize ?? 0);
        const nextLot = Number(next.lotSize ?? 0);
        const currentTime = parseDate(trade.closeTime) ?? parseDate(trade.openTime);
        const nextTime = parseDate(next.openTime) ?? parseDate(next.closeTime);
        if (currentTime && nextTime) {
          const minutes = Math.abs(differenceInMinutes(nextTime, currentTime));
          if (minutes <= 45 && nextLot > thisLot * 1.5 && Number(next.pnl ?? 0) < 0) {
            revengeSpikes += 1;
          }
          if (minutes <= 15) {
            paceBursts += 1;
          }
        }
      }

      const open = parseDate(trade.openTime);
      if (open) {
        const hour = open.getHours();
        if (hour < 6 || hour >= 22) {
          overnightTrades += 1;
        }
      }

      if (trade.emotion) {
        const emotion = String(trade.emotion).toLowerCase();
        if (NEGATIVE_EMOTIONS.some((word) => emotion.includes(word))) {
          negativeEmotionCount += 1;
        }
      }
    });

    const dayMap = new Map<string, number>();
    recent.forEach((trade) => {
      const time = parseDate(trade.closeTime) ?? parseDate(trade.openTime);
      if (!time) return;
      const key = time.toISOString().slice(0, 10);
      dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
    });
    const overtradeDays = Array.from(dayMap.values()).filter((count) => count >= 8).length;

    const signalsList: TiltSignal[] = [];

    signalsList.push({
      id: "loss-streak",
      title: "Extended loss streak",
      severity: longestLossStreak >= 5 ? "high" : longestLossStreak >= 3 ? "medium" : "low",
      message: longestLossStreak >= 3
        ? "Loss streak pressure detected. Schedule a hard stop and review setup criteria before next trade."
        : "Within acceptable streak range. Maintain routine.",
      evidence: `Longest recent streak: ${longestLossStreak} losses in a row`,
    });

    signalsList.push({
      id: "revenge-risk",
      title: "Position size spikes after losses",
      severity: revengeSpikes >= 2 ? "high" : revengeSpikes === 1 ? "medium" : "low",
      message: revengeSpikes
        ? "Lot size jumps within 45 minutes of a loss. Engage cooldown protocol before re-entry."
        : "No revenge trading spikes detected.",
      evidence: `${revengeSpikes} flagged sequences`,
    });

    signalsList.push({
      id: "pace-burst",
      title: "Accelerated trading pace",
      severity: paceBursts >= 4 ? "high" : paceBursts >= 2 ? "medium" : "low",
      message: paceBursts
        ? "Fast re-entry cadence suggests emotional decision making. Follow the breathing/reset checklist."
        : "Pace controlled. Keep journaling context between trades.",
      evidence: `${paceBursts} clusters under 15 minutes`,
    });

    signalsList.push({
      id: "overnight",
      title: "After-hours activity",
      severity: overnightTrades >= 3 ? "high" : overnightTrades > 0 ? "medium" : "low",
      message: overnightTrades
        ? "Trading outside planned hours increases mistake probability. Limit sessions to your peak window."
        : "Trading within approved schedule.",
      evidence: `${overnightTrades} trades logged between 10pm and 6am`,
    });

    signalsList.push({
      id: "emotions",
      title: "Emotional journal tags",
      severity: negativeEmotionCount >= 3 ? "high" : negativeEmotionCount >= 1 ? "medium" : "low",
      message: negativeEmotionCount
        ? "Journal shows stress markers. Trigger the mental reset flow before continuing."
        : "No negative emotion tags detected recently.",
      evidence: `${negativeEmotionCount} recent trades tagged with stress words`,
    });

    signalsList.push({
      id: "overtrade-days",
      title: "Heavy sessions",
      severity: overtradeDays >= 2 ? "high" : overtradeDays === 1 ? "medium" : "low",
      message: overtradeDays
        ? "Multiple days exceeded eight trades. Cap the number of attempts per session to prevent burnout."
        : "Session volume within guardrails.",
      evidence: `${overtradeDays} days trending above 8 trades`,
    });

    return signalsList;
  }, [trades]);

  const totalWeight = signals.reduce((acc, item) => acc + SEVERITY_WEIGHT[item.severity], 0);
  const tiltScore = Math.min(100, Math.round((totalWeight / (signals.length * 3 || 1)) * 100));

  const color = tiltScore < 40 ? "text-emerald-400" : tiltScore < 70 ? "text-yellow-400" : "text-red-400";

  const planMessage = plan === "plus" || plan === "elite"
    ? "Real-time tilt alerts are streaming. Configure push alerts in settings."
    : plan === "pro"
      ? "Upgrade to PLUS for live tilt pings and automated trade blocking."
      : "Upgrade to unlock live tilt monitoring and account lockouts.";

  return (
    <Card className="border border-white/10 bg-black/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-pink-400" /> Tilt Mode Detector
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Gauge className={`w-5 h-5 ${color}`} />
            <div>
              <div className={`text-lg font-semibold ${color}`}>{tiltScore}%</div>
              <div className="text-xs text-muted-foreground">Tilt probability score</div>
            </div>
          </div>
          <div className="flex-1 min-w-[160px]">
            <Progress value={tiltScore} className="h-2" />
          </div>
          <Badge variant="outline" className="text-xs text-muted-foreground bg-white/5">
            {planMessage}
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {signals.map((signal) => {
            const severityColor = signal.severity === "high" ? "text-red-400" : signal.severity === "medium" ? "text-yellow-300" : "text-emerald-300";
            const icon = signal.id === "overnight" ? <Moon className={`w-4 h-4 ${severityColor}`} />
              : signal.id === "pace-burst" ? <Timer className={`w-4 h-4 ${severityColor}`} />
              : signal.severity === "high" ? <Flame className={`w-4 h-4 ${severityColor}`} />
              : <TrendingUp className={`w-4 h-4 ${severityColor}`} />;
            return (
              <div key={signal.id} className="rounded-lg border border-white/10 bg-black/20 p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {icon}
                    <span className="text-sm font-semibold">{signal.title}</span>
                  </div>
                  <Badge variant="secondary" className={`${severityColor} bg-transparent border-white/10 capitalize`}>
                    {signal.severity}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{signal.message}</p>
                {signal.evidence && <div className="text-xs text-muted-foreground/80">{signal.evidence}</div>}
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-white/10 p-4 bg-white/5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-semibold mb-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" /> Next steps
          </div>
          <ul className="list-disc list-inside space-y-1">
            <li>Stop for the day if two high-severity flags appear back-to-back.</li>
            <li>Run the mental reset checklist before re-entering after a flagged streak.</li>
            <li>Lower size to one-third until tilt score drops under 40%.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

