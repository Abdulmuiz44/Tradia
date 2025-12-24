"use client";
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useTrade } from "@/context/TradeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { CompactUpgradePrompt } from "@/components/UpgradePrompt";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  Pencil,
  Save,
  X,
  Download,
  RefreshCw,
  Tag as TagIcon,
  BarChart2,
  ImageIcon,
  FileText,
  Plus,
  Filter,
  Search,
  Star,
  ArrowUpRight,
  Clipboard,
  Upload,
  Calendar as CalendarIcon,
  Check,
  AlertTriangle,
  TrendingUp,
  Sliders,
  Target,
  Flag,
  Award,
  Activity,
  Clock,
  Users,
  Zap,
  Brain,
  Shield,
} from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  subDays,
  isSameDay,
  differenceInCalendarDays,
  parseISO,
} from "date-fns";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  LineController,
  BarController,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { generateInsights, Insight } from "@/utils/generateInsights";
import type { Trade as TradeFromTypes } from "@/types/trade";
import { cn } from "@/lib/utils";
import { useTradeData } from "@/hooks/useTradeData";

import { PLAN_LIMITS, PlanType } from "@/lib/planAccess";
/* ChartJS registration */
ChartJS.register(
  LineElement,
  BarElement,
  LineController,
  BarController,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler
);

/* --------------------------------------------------------------------------------
   Types & helpers
-------------------------------------------------------------------------------- */

type SubTab =
  | "journal"
  | "insights"
  | "patterns"
  | "psychology"
  | "calendar"
  | "forecast"
  | "optimizer"
  | "prop"
  | "review"
  | "mistakes"
  | "risk"
  | "playbook";
type Trade = TradeFromTypes & {
  id?: string | number;
  _id?: string | number;
  tradeId?: string | number;
  openTime?: string | Date;
  closeTime?: string | Date;
  outcome?: string;
  pnl?: number | string;
  symbol?: string;
  note?: string;
  tags?: string[];
  strategy?: string;
  SL?: number | string;
  TP?: number | string;
  rr?: number | string;
  reviewed?: boolean;
  pinned?: boolean;
};

const getTradeId = (t: Trade | { id?: string | number } | string | number): string => {
  if (typeof t === "string" || typeof t === "number") return String(t);
  const raw = (t as any).id ?? (t as any)._id ?? (t as any).tradeId ?? `${(t as any).symbol ?? "UNK"}-${(t as any).openTime ?? Math.random()}`;
  return String(raw);
};

const parsePL = (v?: string | number | null): number => {
  const str = String(v ?? "0");
  const n = parseFloat(str.replace(/[^0-9\.-]/g, ""));
  return isNaN(n) ? 0 : n;
};

const fmtDateTime = (d?: string | Date) => {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : (d as Date);
  return isNaN(dt.getTime()) ? "Invalid Date" : format(dt, "dd MMM yyyy, HH:mm");
};

const toCSV = (rows: Array<Record<string, any>>): string => {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]!);
  const escape = (v: any) => {
    const s = v == null ? "" : String(v);
    if (s.includes(",") || s.includes("\n") || s.includes('"')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))];
  return lines.join("\n");
};

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

const sanitizeForShare = (value: string): string => value.replace(/\b\d{6,}\b/g, '****');

const toDateOrNull = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const parsed = new Date(value as any);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const resolvePlanType = (plan: unknown): PlanType => {
  const normalized = String(plan || '').toLowerCase();
  const aliases: Record<string, PlanType> = {
    free: 'starter',
    starter: 'starter',
    basic: 'starter',
    pro: 'pro',
    plus: 'plus',
    premium: 'plus',
    elite: 'elite',
  };
  return normalized in aliases ? aliases[normalized] : 'starter';
};

/* --------------------------------------------------------------------------
   Subcomponents: HeuristicForecast & PropTracker
--------------------------------------------------------------------------*/

function HeuristicForecast({ trades, summary }: { trades: Trade[]; summary: any }) {
  const N = 12;
  const recent = trades.slice(-N);
  const wins = recent.filter((t) => (t.outcome ?? "").toLowerCase() === "win").length;
  const recentWinRate = recent.length ? wins / recent.length : summary.winRate / 100;
  let streak = 0;
  for (let i = trades.length - 1; i >= 0; i--) {
    const o = (trades[i]?.outcome ?? "").toLowerCase();
    if (o === "win") { if (streak >= 0) streak++; else break; }
    else if (o === "loss") { if (streak <= 0) streak--; else break; }
    else break;
  }
  const streakFactor = Math.tanh(streak / 5);
  const expectancyNorm = summary.expectancy / (Math.abs(summary.avgWin) + Math.abs(summary.avgLoss) + 1);
  const score = 2.0 * recentWinRate + 1.2 * streakFactor + 1.5 * (expectancyNorm || 0);
  const p = Math.round(sigmoid(score - 1.5) * 100);
  return (
    <div className="rounded-lg border border-white/10 p-4 bg-white/5 dark:bg-[#0f1319]/30">
      <div className="text-sm text-muted-foreground">Probability next trade will be a WIN</div>
      <div className="text-3xl font-semibold my-3">{p}%</div>
      <div className="text-xs text-zinc-400">Recent WR {(recentWinRate * 100).toFixed(1)}% - streak {streak} - expectancy {summary.expectancy.toFixed(2)}</div>
      <div className="mt-4 flex gap-2">
        <Button variant="secondary" onClick={() => navigator.clipboard.writeText(sanitizeForShare(`${p}% - Recent WR ${(recentWinRate * 100).toFixed(1)}%`))}>
          Copy
        </Button>
        <Button variant="ghost" onClick={() => alert("Heuristic forecast: uses recent WR, streak, and expectancy. Replace with a trained model for production.")}>
          Why this?
        </Button>
      </div>
    </div>
  );
}

function PropTracker({ trades }: { trades: Trade[] }) {
  const [propInitial, setPropInitial] = useState<number | "">(100000);
  const [propTargetPercent, setPropTargetPercent] = useState<number>(10);
  const [propMaxDrawdownPercent, setPropMaxDrawdownPercent] = useState<number>(5);
  const [propMinWinRate, setPropMinWinRate] = useState<number>(50);

  const propStatus = useMemo(() => {
    const initial = typeof propInitial === "number" && propInitial > 0 ? propInitial : 100000;
    const pnl = trades.reduce((s, t) => s + parsePL(t.pnl), 0);
    const current = initial + pnl;
    const pctGain = ((current - initial) / initial) * 100;
    let peak = initial;
    let maxDD = 0;
    let equity = initial;
    const sortedChron = [...trades].sort((a, b) => {
      const aTime = new Date(a.openTime as any);
      const bTime = new Date(b.openTime as any);
      const aValid = !isNaN(aTime.getTime()) ? aTime.getTime() : 0;
      const bValid = !isNaN(bTime.getTime()) ? bTime.getTime() : 0;
      return aValid - bValid;
    });
    for (const t of sortedChron) {
      equity += parsePL(t.pnl);
      if (equity > peak) peak = equity;
      const dd = ((peak - equity) / peak) * 100;
      if (dd > maxDD) maxDD = dd;
    }
    const winCount = trades.filter(t => (t.outcome ?? "").toLowerCase() === "win").length;
    const total = trades.length;
    const winRate = total ? (winCount / total) * 100 : 0;
    const passedTarget = pctGain >= propTargetPercent;
    const passedDD = maxDD <= propMaxDrawdownPercent;
    const passedWinRate = winRate >= propMinWinRate;

    return {
      initial,
      pnl,
      current,
      pctGain,
      maxDD,
      winRate,
      passedTarget,
      passedDD,
      passedWinRate,
      milestones: [propTargetPercent, propTargetPercent * 2, propTargetPercent * 3].map(m => ({
        percent: m,
        achieved: pctGain >= m
      }))
    };
  }, [trades, propInitial, propTargetPercent, propMaxDrawdownPercent, propMinWinRate]);

  return (
    <Card className="w-full overflow-hidden rounded-2xl shadow-md border bg-[#0f1319] border-[#202830]">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Flag className="h-5 w-5" />
          <h3 className="font-semibold">Prop-Firm & Milestone Tracker</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-zinc-800 p-4 bg-[#0f1319]/50">
            <div className="text-xs text-zinc-400">Initial funded account</div>
            <input
              type="number"
              placeholder="Initial capital"
              className="w-full mt-2 p-2 rounded bg-[#0f1319]"
              value={propInitial === "" ? "" : String(propInitial)}
              onChange={(e) => setPropInitial(e.target.value === "" ? "" : Number(e.target.value))}
            />
            <div className="flex gap-2 mt-3">
              <input
                type="number"
                placeholder="Target %"
                className="w-1/2 p-2 rounded bg-[#0f1319]"
                value={String(propTargetPercent)}
                onChange={(e) => setPropTargetPercent(Number(e.target.value))}
              />
              <input
                type="number"
                placeholder="Max DD %"
                className="w-1/2 p-2 rounded bg-[#0f1319]"
                value={String(propMaxDrawdownPercent)}
                onChange={(e) => setPropMaxDrawdownPercent(Number(e.target.value))}
              />
            </div>
            <div className="flex gap-2 mt-3">
              <input
                type="number"
                placeholder="Min WR %"
                className="w-1/2 p-2 rounded bg-[#0f1319]"
                value={String(propMinWinRate)}
                onChange={(e) => setPropMinWinRate(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 p-4 bg-[#0f1319]/50">
            <div className="text-sm text-zinc-300">Progress</div>
            <div className="text-2xl text-white my-2">{propStatus.pctGain.toFixed(2)}%</div>
            <div className="text-xs text-zinc-400">
              Net P/L: ${propStatus.pnl.toFixed(2)} - Current equity: ${propStatus.current.toFixed(2)}
            </div>
            <div className="mt-3 text-xs text-zinc-300 mb-2">
              Max Drawdown: {propStatus.maxDD.toFixed(2)}% (limit {propMaxDrawdownPercent}%)
            </div>
            <div className="w-full bg-[#0f1319] rounded h-3 overflow-hidden">
              <div
                style={{ width: `${Math.min(100, Math.max(0, propStatus.maxDD))}%` }}
                className={`h-3 ${propStatus.maxDD <= propMaxDrawdownPercent ? "bg-green-500" : "bg-red-500"}`}
              />
            </div>
            <div className="mt-4 space-y-2">
              <div className="text-xs text-zinc-300">
                Win Rate: {propStatus.winRate.toFixed(1)}% - Required: {propMinWinRate}%
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    const status = [];
                    if (propStatus.passedTarget) status.push("Target OK");
                    if (propStatus.passedDD) status.push("Drawdown OK");
                    if (propStatus.passedWinRate) status.push("WinRate OK");
                    alert(`Prop check:\n${status.length ? status.join("\n") : "Not passing yet."}`);
                  }}
                >
                  Check
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => alert("This tracker is heuristic. Use official prop-firm rules for compliance.")}
                >
                  Explain
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white mb-2">Milestones</h4>
          <div className="flex flex-wrap gap-2">
            {propStatus.milestones.map(m => (
              <div
                key={m.percent}
                className={`p-3 rounded-md ${m.achieved ? "bg-green-800" : "bg-[#0f1319]/30"} border border-zinc-800 text-sm`}
              >
                {m.percent}% - {m.achieved ? "Achieved" : "Pending"}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------
   Main component
------------------------------------------------------------------------- */
export default function TradeJournal(): React.ReactElement {
  const { data: session } = useSession();

  const roleStr = String((session?.user as any)?.role || "").toLowerCase();
  const emailStr = String((session?.user as any)?.email || "").toLowerCase();
  const isAdmin = roleStr === "admin" || emailStr === "abdulmuizproject@gmail.com";

  const rawPlan = (session?.user as any)?.plan;
  const planType = resolvePlanType(rawPlan);
  const effectivePlan: PlanType = isAdmin ? "elite" : planType;
  const planLimits = PLAN_LIMITS[effectivePlan];
  const planRank: Record<PlanType, number> = { starter: 0, pro: 1, plus: 2, elite: 3 };
  const hasPlan = (min: PlanType = "starter") => planRank[effectivePlan] >= planRank[min];

  const { trades = [], updateTrade, deleteTrade, refreshTrades } = useTrade() as any;
  const tradeDataHook = useTradeData();

  const canUseAdvancedAnalytics = Boolean(planLimits.advancedAnalytics);
  const canUsePatterns = Boolean(planLimits.realTimeAnalytics);
  const canUseForecast = Boolean(planLimits.aiMLAnalysis && planLimits.realTimeAnalytics);
  const canUseOptimizer = Boolean(planLimits.riskManagement);
  const canUseRiskTab = Boolean(planLimits.riskManagement);
  const canUsePropDesk = Boolean(planLimits.customIntegrations);
  const canUseMistakeAnalyzer = Boolean(planLimits.advancedAnalytics);
  const canUsePlaybook = planLimits.maxTradePlans !== 0;
  const canExportData = Boolean(planLimits.exportData);
  const canShareReports = Boolean(planLimits.shareReports);

  // UI state
  const [filter, setFilter] = useState<"all" | "win" | "loss" | "breakeven">("all");
  const [search, setSearch] = useState("");
  const [subTab, setSubTab] = useState<SubTab>("journal");
  const [editMode, setEditMode] = useState(false);
  const [rowEdits, setRowEdits] = useState<Record<string, Partial<Trade> & Record<string, any>>>({});
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({});
  const [attachments, setAttachments] = useState<Record<string, File[]>>({});
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [pinnedMap, setPinnedMap] = useState<Record<string, boolean>>({});
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(startOfMonth(new Date()));
  const [importPreview, setImportPreview] = useState<Trade[] | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [accountBalance, setAccountBalance] = useState<number | "">("");
  const [riskPercent, setRiskPercent] = useState<number>(1);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }),
    []
  );
  const projectedRisk = useMemo(() => {
    const balance = typeof accountBalance === "number" ? accountBalance : Number(accountBalance) || 0;
    return balance * (riskPercent / 100);
  }, [accountBalance, riskPercent]);

  const storageKey = "trading_psych_note_" + (session?.user?.email ?? session?.user?.name ?? "anon");
  const [psychNote, setPsychNote] = useState<string>("");

  // Strategy playbooks (persisted locally, plan-limited)
  const playbookKey = "trade_playbooks_" + (session?.user?.email ?? session?.user?.name ?? "anon");
  const [playbooks, setPlaybooks] = useState<Array<{ id: string; name: string; entry: string; exit: string; notes?: string }>>([]);
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(playbookKey) : null;
      if (raw) setPlaybooks(JSON.parse(raw));
    } catch {
      // ignore corrupted cache
    }
  }, [playbookKey]);
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(playbookKey, JSON.stringify(playbooks));
      }
    } catch {
      // ignore write failures (private mode, etc.)
    }
  }, [playbooks, playbookKey]);

  const playbookLimitRaw = planLimits.maxTradePlans;
  const playbookLimit = playbookLimitRaw === -1 ? Number.POSITIVE_INFINITY : playbookLimitRaw;

  const moods = ["Calm", "Confident", "Focused", "Neutral", "Curious", "Tense", "Tilted"];
  const prompts = [
    "What was the exact trigger for entering the trade?",
    "How aligned was this setup with your playbook?",
    "What emotion was strongest before taking the trade?",
    "If you could replay this trade, what would you adjust?",
    "Did the position size respect your risk parameters?",
    "What confirmed the exit, and did you follow it precisely?",
  ];
  const randomPrompt = () => prompts[Math.floor(Math.random() * prompts.length)];

  const TAB_CONFIG: { value: SubTab; label: string; icon: React.ReactNode; accent: string; locked?: boolean }[] = [
    { value: "journal", label: "Journal", icon: <FileText className="h-4 w-4" />, accent: "linear-gradient(135deg, rgba(56,189,248,0.85), rgba(129,140,248,0.85))" },
    { value: "insights", label: "Insights", icon: <Zap className="h-4 w-4" />, accent: "linear-gradient(135deg, rgba(251,191,36,0.85), rgba(249,115,22,0.85))", locked: !canUseAdvancedAnalytics },
    { value: "patterns", label: "Patterns", icon: <BarChart2 className="h-4 w-4" />, accent: "linear-gradient(135deg, rgba(34,197,94,0.85), rgba(74,222,128,0.85))", locked: !canUsePatterns },
    { value: "psychology", label: "Psychology", icon: <Brain className="h-4 w-4" />, accent: "linear-gradient(135deg, rgba(236,72,153,0.85), rgba(168,85,247,0.85))" },
    { value: "calendar", label: "Calendar", icon: <CalendarIcon className="h-4 w-4" />, accent: "linear-gradient(135deg, rgba(34,211,238,0.85), rgba(14,165,233,0.85))" },
    { value: "forecast", label: "Forecast", icon: <Target className="h-4 w-4" />, accent: "linear-gradient(135deg, rgba(59,130,246,0.85), rgba(129,140,248,0.85))", locked: !canUseForecast },
    { value: "optimizer", label: "Optimizer", icon: <Sliders className="h-4 w-4" />, accent: "linear-gradient(135deg, rgba(249,115,22,0.85), rgba(253,224,71,0.85))", locked: !canUseOptimizer },
    { value: "prop", label: "Prop Desk", icon: <Users className="h-4 w-4" />, accent: "linear-gradient(135deg, rgba(13,148,136,0.85), rgba(45,212,191,0.85))", locked: !canUsePropDesk },
    { value: "review", label: "Review", icon: <Clipboard className="h-4 w-4" />, accent: "linear-gradient(135deg, rgba(167,139,250,0.85), rgba(233,213,255,0.85))" },
    { value: "mistakes", label: "Mistakes", icon: <AlertTriangle className="h-4 w-4" />, accent: "linear-gradient(135deg, rgba(244,63,94,0.85), rgba(251,113,133,0.85))", locked: !canUseMistakeAnalyzer },
    { value: "risk", label: "Risk", icon: <Shield className="h-4 w-4" />, accent: "linear-gradient(135deg, rgba(239,68,68,0.85), rgba(248,113,113,0.85))", locked: !canUseRiskTab },
    { value: "playbook", label: "Playbook", icon: <Star className="h-4 w-4" />, accent: "linear-gradient(135deg, rgba(132,204,22,0.85), rgba(190,242,100,0.85))", locked: !canUsePlaybook },
  ];

  const activeTabConfig = TAB_CONFIG.find((tab) => tab.value === subTab) ?? TAB_CONFIG[0];

  const storageLimitDays = planLimits.tradeStorageDays;
  const storageFiltered = useMemo(() => {
    const rawTrades = (trades as Trade[]) ?? [];
    const cutoff = storageLimitDays && storageLimitDays > 0 ? subDays(new Date(), storageLimitDays) : null;
    const filtered: Trade[] = [];
    const seen = new Set<string>();
    let trimmedOld = 0;
    let duplicates = 0;

    rawTrades.forEach((trade) => {
      if (cutoff) {
        const rawTimestamp = trade.closeTime ?? trade.openTime ?? (trade as any).closed_at ?? (trade as any).created_at;
        const parsed = toDateOrNull(rawTimestamp);
        if (parsed && parsed < cutoff) {
          trimmedOld += 1;
          return;
        }
      }
      const id = getTradeId(trade);
      if (seen.has(id)) {
        duplicates += 1;
        return;
      }
      seen.add(id);
      filtered.push(trade);
    });

    return { trades: filtered, trimmedOld, duplicates, cutoff };
  }, [trades, storageLimitDays]);

  const tradesTyped = storageFiltered.trades;
  const trimmedCount = storageFiltered.trimmedOld;
  const duplicateCount = storageFiltered.duplicates;
  const storageCutoff = storageFiltered.cutoff;
  const storageLimitLabel = storageLimitDays === -1 ? 'unlimited' : `${storageLimitDays} day${storageLimitDays === 1 ? '' : 's'}`;
  type NormalizedTrade = Trade & {
    openAt: Date | null;
    closeAt: Date | null;
    durationMinutes: number | null;
    pnlValue: number;
    outcomeKey: string;
    symbolKey: string;
    riskReward?: number | null;
  };

  const normalizedTrades: NormalizedTrade[] = useMemo(() => {
    return tradesTyped.map((trade) => {
      const openAtRaw = trade.openTime || (trade as any).opened_at || (trade as any).created_at;
      const closeAtRaw = trade.closeTime || (trade as any).closed_at;
      const openAt = toDateOrNull(openAtRaw);
      const closeAt = toDateOrNull(closeAtRaw);
      const durationMinutes = openAt && closeAt ? Math.max(0, (closeAt.getTime() - openAt.getTime()) / 60000) : null;
      const pnlValue = parsePL(trade.pnl);
      const outcomeKey = (trade.outcome ?? '').toLowerCase();
      const symbolKey = (trade.symbol ?? (trade as any).instrument ?? 'Unknown').toUpperCase();
      const riskReward = trade.rr ? Number(trade.rr) : undefined;
      return { ...trade, openAt, closeAt, durationMinutes, pnlValue, outcomeKey, symbolKey, riskReward };
    });
  }, [tradesTyped]);

  const JournalRow = ({ trade }: { trade: NormalizedTrade }) => {
    const id = getTradeId(trade);
    const isSelected = Boolean(selected[id]);
    const isPinned = Boolean(pinnedMap[id]);
    const toggleSelect = () => {
      setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
    };
    const togglePin = () => {
      setPinnedMap((prev) => ({ ...prev, [id]: !prev[id] }));
      updateTrade({ ...(trade as Trade), pinned: !isPinned } as Trade);
    };
    const handleDelete = () => {
      deleteTrade(id);
    };

    return (
      <div className="py-3 grid md:grid-cols-[1.3fr,1fr,1fr,1.3fr,1fr,auto] gap-3 text-sm">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSelect}
              className={`h-5 w-5 rounded-full border ${isSelected ? "border-emerald-400 bg-emerald-500/20" : "border-zinc-600"}`}
              aria-pressed={isSelected}
            />
            <div>
              <div className="text-xs text-zinc-400">{fmtDateTime(trade.openAt ?? trade.openTime)}</div>
              <div className="text-xs text-zinc-500">
                {trade.durationMinutes ? `${trade.durationMinutes.toFixed(0)} min` : ""}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-zinc-200">{trade.symbol}</span>
          <span className="text-xs text-zinc-400">{trade.strategy || ""}</span>
        </div>
        <div className="flex flex-col">
          <span className={`font-semibold ${trade.pnlValue >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {currencyFormatter.format(trade.pnlValue)}
          </span>
          <span className="text-xs text-zinc-400">{trade.outcome}</span>
        </div>
        <div className="text-xs text-zinc-300 space-y-1">
          <div>{Array.isArray(trade.tags) ? trade.tags.join(", ") : trade.tags || ""}</div>
          {trade.riskReward ? <div className="text-amber-300">RR: {trade.riskReward}</div> : null}
        </div>
        <div className="text-xs text-zinc-400 line-clamp-3 break-words">
          {trade.note || trade.journalNotes || "—"}
        </div>
        <div className="flex flex-wrap justify-end gap-2 text-xs">
          <Button variant="ghost" size="sm" onClick={togglePin}>
            {isPinned ? "Unpin" : "Pin"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => updateTrade({ ...(trade as Trade), rr: trade.riskReward ?? 1 } as Trade)}
          >
            Apply RR
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>
    );
  };

  const applySltpToSelected = useCallback(
    (rr: number) => {
      const ratio = Number(rr);
      if (!Number.isFinite(ratio) || ratio <= 0) return;
      const targets = Object.entries(selected)
        .filter(([, isSelected]) => isSelected)
        .map(([id]) => id);
      if (!targets.length) return;
      targets.forEach((id) => {
        const match = normalizedTrades.find((trade) => getTradeId(trade) === id);
        if (!match) return;
        updateTrade({ ...(match as Trade), rr: ratio });
      });
    },
    [normalizedTrades, selected, updateTrade]
  );

  const addMoodStamp = useCallback(
    (mood: string) => {
      if (!mood) return;
      const stamp = `[${format(new Date(), "PP p")}] Mood: ${mood}`;
      setPsychNote((prev) => (prev ? `${prev}\n${stamp}` : stamp));
    },
    []
  );

  useEffect(() => {
    setPinnedMap((prev) => {
      const next: Record<string, boolean> = {};
      normalizedTrades.forEach((trade) => {
        const id = getTradeId(trade);
        next[id] = prev[id] ?? Boolean((trade as any).pinned);
      });
      return next;
    });
  }, [normalizedTrades]);

  useEffect(() => {
    if (!tradesTyped.length) {
      setSelected({});
      return;
    }
    setSelected((prev) => {
      const keys = Object.keys(prev);
      if (!keys.length) return prev;
      const valid = new Set(tradesTyped.map((trade) => getTradeId(trade)));
      const next: Record<string, boolean> = {};
      let changed = false;
      keys.forEach((id) => {
        if (prev[id] && valid.has(id)) {
          next[id] = true;
        } else if (prev[id]) {
          changed = true;
        }
      });
      if (!changed && keys.length === Object.keys(next).length) {
        return prev;
      }
      return next;
    });
  }, [tradesTyped]);

  const filteredTrades = useMemo(() => {
    const searchLower = search.trim().toLowerCase();
    return normalizedTrades
      .filter((trade) => {
        if (filter !== 'all' && trade.outcomeKey !== filter) return false;
        if (pinnedOnly && !pinnedMap[getTradeId(trade)]) return false;
        if (tagFilter && !(Array.isArray(trade.tags) && trade.tags.includes(tagFilter))) return false;
        if (selectedDay && trade.openAt) {
          if (!isSameDay(trade.openAt, selectedDay)) return false;
        }
        if (searchLower) {
          const haystack = [
            trade.symbolKey,
            trade.outcomeKey,
            trade.strategy ?? '',
            trade.note ?? '',
            ...(Array.isArray(trade.tags) ? trade.tags.join(' ') : ''),
          ]
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(searchLower)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aTime = a.openAt ? a.openAt.getTime() : 0;
        const bTime = b.openAt ? b.openAt.getTime() : 0;
        return bTime - aTime;
      });
  }, [normalizedTrades, filter, pinnedOnly, pinnedMap, tagFilter, selectedDay, search]);

  const sorted = filteredTrades;
  const totalPinned = useMemo(() => Object.values(pinnedMap).filter(Boolean).length, [pinnedMap]);
  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);

  const handleExportCsv = useCallback(() => {
    if (!canExportData) return;
    const target = selectedCount ? normalizedTrades.filter((trade) => selected[getTradeId(trade)]) : normalizedTrades;
    if (!target.length || typeof window === 'undefined') return;
    const rows = target.map((trade) => ({
      date: trade.openAt ? format(trade.openAt, 'yyyy-MM-dd HH:mm') : '',
      symbol: trade.symbol ?? '',
      outcome: trade.outcome ?? '',
      pnl: trade.pnlValue?.toFixed(2) ?? '0.00',
      note: sanitizeForShare((trade.note ?? '').slice(0, 240)),
      tags: Array.isArray(trade.tags) ? trade.tags.join(' ') : ''
    }));
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tradia-journal-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, [canExportData, normalizedTrades, selected, selectedCount]);

  const Toolbar = (
    <Card className="w-full overflow-hidden border border-white/10 bg-white/5 dark:bg-[#0f1319]/30">
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: 'All', value: 'all' },
            { label: 'Wins', value: 'win' },
            { label: 'Losses', value: 'loss' },
            { label: 'B/E', value: 'breakeven' }
          ].map((item) => (
            <Button
              key={item.value}
              size="sm"
              variant={filter === item.value ? 'secondary' : 'ghost'}
              onClick={() => setFilter(item.value as typeof filter)}
            >
              {item.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant={pinnedOnly ? 'secondary' : 'ghost'}
            onClick={() => setPinnedOnly((val) => !val)}
          >
            {pinnedOnly ? 'Pinned only' : 'All trades'}
          </Button>
          {tagFilter && (
            <Button size="sm" variant="outline" onClick={() => setTagFilter(null)}>
              Clear tag: {tagFilter}
            </Button>
          )}
          {selectedCount > 0 && (
            <Badge variant="outline" className="border-emerald-500/60 text-emerald-300">{selectedCount} selected</Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search journal..."
              className="h-9 w-48 rounded-md border border-white/10 bg-black/30 pl-7 pr-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
              type="search"
            />
          </div>
          <Button size="sm" variant="ghost" onClick={() => refreshTrades()}>
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleExportCsv}
            disabled={!canExportData || (!selectedCount && !normalizedTrades.length)}
          >
            <Download className="mr-1 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const analytics = useMemo(() => {
    if (!normalizedTrades.length) {
      const emptyPatterns = { stratMap: {}, topSymbols: [], byDOW: {}, sessions: {}, hours: Array.from({ length: 24 }, (_, hour) => ({ hour, trades: 0, pl: 0 })), calMap: {} as Record<string, { trades: number; net: number }> };
      return {
        summary: {
          total: 0,
          win: 0,
          loss: 0,
          breakeven: 0,
          netPL: 0,
          avgPL: 0,
          winRate: 0,
          expectancy: 0,
          avgWin: 0,
          avgLoss: 0,
          consistency: 0,
          avgLengthMin: 0,
          sharpe: 0,
          bestTrade: null,
          worstTrade: null,
          drawdown: 0,
          volatility: 0,
          var95: 0,
          pnlSeries: [],
        },
        patterns: emptyPatterns,
        charts: {
          pnp: { labels: [], datasets: [] },
          rollingWinData: { labels: [], datasets: [] },
          pnlHistogram: { labels: [], datasets: [] },
        },
        computedInsights: [],
        streaks: { maxWinStreak: 0, maxLossStreak: 0, currentStreak: 0, currentDirection: 'flat' },
        revengeDetector: { flagged: false, reason: '' },
      };
    }

    let wins = 0;
    let losses = 0;
    let breakeven = 0;
    let netPL = 0;
    let winPnL = 0;
    let lossPnL = 0;
    const pnlSeries: number[] = [];
    const durations: number[] = [];
    const equitySeries: number[] = [];
    const equityLabels: string[] = [];
    let equity = 0;
    let peak = 0;
    let maxDrawdown = 0;
    const dailyMap = new Map<string, { trades: number; net: number }>();

    let bestTrade: NormalizedTrade | null = null;
    let worstTrade: NormalizedTrade | null = null;

    const stratMap: Record<string, { trades: number; wins: number; losses: number; breakeven: number; netPL: number; rrTotal: number }> = {};
    const symbolMap: Record<string, { trades: number; wins: number; netPL: number }> = {};
    const dowMap: Record<string, { trades: number; pl: number }> = {};
    const sessionMap: Record<string, { count: number; pl: number }> = {};
    const hourStats = Array.from({ length: 24 }, () => ({ trades: 0, pl: 0 }));
    const calMap: Record<string, { trades: number; net: number }> = {};

    const sessionForHour = (hour: number) => {
      if (hour >= 0 && hour < 7) return 'Asia';
      if (hour >= 7 && hour < 12) return 'London';
      if (hour >= 12 && hour < 17) return 'New York';
      return 'Sydney';
    };

    const ordered = [...normalizedTrades].sort((a, b) => {
      const aTime = a.openAt ? a.openAt.getTime() : 0;
      const bTime = b.openAt ? b.openAt.getTime() : 0;
      return aTime - bTime;
    });

    ordered.forEach((trade) => {
      const { pnlValue, outcomeKey, durationMinutes, symbolKey, strategy, riskReward } = trade;
      netPL += pnlValue;
      pnlSeries.push(pnlValue);

      equity += pnlValue;
      equitySeries.push(equity);
      peak = Math.max(peak, equity);
      if (peak) {
        const dd = ((peak - equity) / peak) * 100;
        if (dd > maxDrawdown) maxDrawdown = dd;
      }

      const labelDate = trade.closeAt ?? trade.openAt;
      equityLabels.push(labelDate ? format(labelDate, 'dd MMM') : 'Trade ' + (equityLabels.length + 1));

      if (durationMinutes != null) durations.push(durationMinutes);

      if (outcomeKey === 'win') {
        wins += 1;
        winPnL += pnlValue;
      } else if (outcomeKey === 'loss') {
        losses += 1;
        lossPnL += pnlValue;
      } else {
        breakeven += 1;
      }

      if (!bestTrade || pnlValue > (bestTrade.pnlValue ?? -Infinity)) bestTrade = trade;
      if (!worstTrade || pnlValue < (worstTrade.pnlValue ?? Infinity)) worstTrade = trade;

      const stratKey = (strategy ?? 'Unclassified').trim() || 'Unclassified';
      stratMap[stratKey] = stratMap[stratKey] || { trades: 0, wins: 0, losses: 0, breakeven: 0, netPL: 0, rrTotal: 0 };
      stratMap[stratKey].trades += 1;
      stratMap[stratKey].netPL += pnlValue;
      if (riskReward) stratMap[stratKey].rrTotal += riskReward;
      if (outcomeKey === 'win') stratMap[stratKey].wins += 1;
      else if (outcomeKey === 'loss') stratMap[stratKey].losses += 1;
      else stratMap[stratKey].breakeven += 1;

      symbolMap[symbolKey] = symbolMap[symbolKey] || { trades: 0, wins: 0, netPL: 0 };
      symbolMap[symbolKey].trades += 1;
      symbolMap[symbolKey].netPL += pnlValue;
      if (outcomeKey === 'win') symbolMap[symbolKey].wins += 1;

      const dayKey = trade.openAt ? format(trade.openAt, 'yyyy-MM-dd') : 'unknown';
      const dayEntry = dailyMap.get(dayKey) || { trades: 0, net: 0 };
      dayEntry.trades += 1;
      dayEntry.net += pnlValue;
      dailyMap.set(dayKey, dayEntry);
      calMap[dayKey] = { trades: dayEntry.trades, net: dayEntry.net };

      const dowKey = trade.openAt ? format(trade.openAt, 'EEEE') : 'Unknown';
      dowMap[dowKey] = dowMap[dowKey] || { trades: 0, pl: 0 };
      dowMap[dowKey].trades += 1;
      dowMap[dowKey].pl += pnlValue;

      if (trade.openAt) {
        const hour = trade.openAt.getUTCHours();
        hourStats[hour].trades += 1;
        hourStats[hour].pl += pnlValue;
        const sessionKey = sessionForHour(hour);
        sessionMap[sessionKey] = sessionMap[sessionKey] || { count: 0, pl: 0 };
        sessionMap[sessionKey].count += 1;
        sessionMap[sessionKey].pl += pnlValue;
      }
    });

    const total = normalizedTrades.length;
    const avgPL = total ? netPL / total : 0;
    const avgWin = wins ? winPnL / wins : 0;
    const avgLoss = losses ? lossPnL / losses : 0;
    const winRate = total ? (wins / total) * 100 : 0;
    const expectancy = winRate / 100 * avgWin + (1 - winRate / 100) * avgLoss;
    const avgLengthMin = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    const pnlMean = pnlSeries.length ? pnlSeries.reduce((a, b) => a + b, 0) / pnlSeries.length : 0;
    const variance = pnlSeries.length ? pnlSeries.reduce((acc, val) => acc + Math.pow(val - pnlMean, 2), 0) / pnlSeries.length : 0;
    const stdDev = Math.sqrt(variance);
    const sharpe = stdDev ? (avgPL / (stdDev || 1)) * Math.sqrt(Math.max(total, 1)) : 0;

    const dailyValues = Array.from(dailyMap.values());
    const profitableDays = dailyValues.filter((d) => d.net > 0).length;
    const consistency = dailyValues.length ? (profitableDays / dailyValues.length) * 100 : 0;

    const volatility = stdDev;
    const var95 = pnlMean - 1.65 * stdDev;

    const stratEntries = Object.entries(stratMap).reduce<Record<string, { trades: number; wins: number; losses: number; breakeven: number; netPL: number; avgRR: number | null }>>((acc, [key, value]) => {
      const avgRR = value.trades ? value.rrTotal / value.trades : null;
      acc[key] = {
        trades: value.trades,
        wins: value.wins,
        losses: value.losses,
        breakeven: value.breakeven,
        netPL: value.netPL,
        avgRR,
      };
      return acc;
    }, {});

    const topSymbols = Object.entries(symbolMap)
      .map(([symbol, data]) => ({
        symbol,
        trades: data.trades,
        winRate: data.trades ? (data.wins / data.trades) * 100 : 0,
        netPL: data.netPL,
      }))
      .sort((a, b) => b.netPL - a.netPL)
      .slice(0, 5);

    const rollingWindow = Math.min(10, normalizedTrades.length);
    const rollingLabels: string[] = [];
    const rollingValues: number[] = [];
    ordered.forEach((trade, idx) => {
      const slice = ordered.slice(Math.max(0, idx - rollingWindow + 1), idx + 1);
      const winsInSlice = slice.filter((t) => t.outcomeKey === 'win').length;
      const rate = slice.length ? (winsInSlice / slice.length) * 100 : 0;
      const label = trade.closeAt ? format(trade.closeAt, 'dd MMM') : '#' + (idx + 1);
      rollingLabels.push(label);
      rollingValues.push(Number(rate.toFixed(1)));
    });

    const pnlHistogram = {
      labels: ['Wins', 'Losses'],
      datasets: [
        {
          label: 'Total PnL',
          data: [Math.max(winPnL, 0), Math.abs(Math.min(lossPnL, 0))],
          backgroundColor: ['rgba(34,197,94,0.6)', 'rgba(239,68,68,0.6)'],
          borderRadius: 6,
        },
      ],
    };

    const summary = {
      total,
      win: wins,
      loss: losses,
      breakeven,
      netPL,
      avgPL,
      winRate,
      expectancy,
      avgWin,
      avgLoss,
      consistency,
      avgLengthMin,
      sharpe,
      bestTrade,
      worstTrade,
      drawdown: maxDrawdown,
      volatility,
      var95,
      pnlSeries,
    };

    const hours = hourStats.map((h, hour) => ({ hour, trades: h.trades, pl: h.pl }));

    const patterns = {
      stratMap: stratEntries,
      topSymbols,
      byDOW: dowMap,
      sessions: sessionMap,
      hours,
      calMap,
    };

    const charts = {
      pnp: {
        labels: equityLabels,
        datasets: [
          {
            label: 'Equity curve',
            data: equitySeries,
            fill: true,
            borderColor: 'rgba(129,140,248,0.9)',
            backgroundColor: 'rgba(129,140,248,0.15)',
            tension: 0.35,
          },
        ],
      },
      rollingWinData: {
        labels: rollingLabels,
        datasets: [
          {
            label: 'Rolling win %',
            data: rollingValues,
            borderColor: 'rgba(236,72,153,0.9)',
            backgroundColor: 'rgba(236,72,153,0.2)',
            fill: true,
            tension: 0.25,
          },
        ],
      },
      pnlHistogram,
    };

    const insightItems = [] as { id: string; title: string; detail: string; score: number }[];
    insightItems.push({
      id: 'equity-momentum',
      title: netPL >= 0 ? 'Equity momentum positive' : 'Equity under pressure',
      detail: netPL >= 0 ? 'Up ${currencyFormatter.format(netPL)} across ' + total + ' trades. Maintain discipline.' : 'Down ' + currencyFormatter.format(Math.abs(netPL)) + '. Reinforce playbook-only setups.',
      score: Math.min(100, Math.max(0, (netPL / (Math.abs(netPL) + 1)) * 100 + 50)),
    });
    if (topSymbols[0]) {
      insightItems.push({
        id: 'top-symbol',
        title: 'Best performing symbol: ' + topSymbols[0].symbol,
        detail: topSymbols[0].trades + ' trades with ' + topSymbols[0].winRate.toFixed(1) + '% win rate producing ' + currencyFormatter.format(topSymbols[0].netPL) + '.',
        score: Math.min(100, Math.max(0, topSymbols[0].winRate)),
      });
    }
    const toughestHour = hours.reduce((worst, hour) => (hour.pl < worst.pl ? hour : worst), { hour: 0, trades: 0, pl: Infinity });
    insightItems.push({
      id: 'challenging-hour',
      title: 'Tricky hour: ' + toughestHour.hour + ':00 UTC',
      detail: currencyFormatter.format(toughestHour.pl) + ' across ' + toughestHour.trades + ' trades. Consider standing aside at this time unless setup quality is exceptional.',
      score: Math.min(100, Math.max(0, 100 - Math.abs(toughestHour.pl))),
    });

    const streaks = (() => {
      let maxWinStreak = 0;
      let maxLossStreak = 0;
      let current = 0;
      let currentDirection: 'up' | 'down' | 'flat' = 'flat';
      ordered.forEach((trade) => {
        if (trade.outcomeKey === 'win') {
          if (current >= 0) current += 1; else current = 1;
          currentDirection = 'up';
        } else if (trade.outcomeKey === 'loss') {
          if (current <= 0) current -= 1; else current = -1;
          currentDirection = 'down';
        } else {
          current = 0;
          currentDirection = 'flat';
        }
        if (current > maxWinStreak) maxWinStreak = current;
        if (current < maxLossStreak) maxLossStreak = current;
      });
      return { maxWinStreak, maxLossStreak: Math.abs(maxLossStreak), currentStreak: Math.abs(current), currentDirection };
    })();

    const revengeDetector = (() => {
      let flagged = false;
      let reason = '';
      for (let i = 1; i < ordered.length; i += 1) {
        const prev = ordered[i - 1];
        const curr = ordered[i];
        if (prev.pnlValue < 0 && curr.openAt && prev.closeAt) {
          const minutesApart = (curr.openAt.getTime() - prev.closeAt.getTime()) / 60000;
          if (minutesApart <= 20 && curr.pnlValue < 0) {
            flagged = true;
            reason = 'Back-to-back losses within 20 minutes detected. Pause and review before next trade.';
            break;
          }
        }
      }
      return { flagged, reason };
    })();

    return { summary, patterns, charts, computedInsights: insightItems, streaks, revengeDetector };
  }, [normalizedTrades, currencyFormatter]);

  const { summary, patterns, charts, computedInsights, streaks, revengeDetector } = analytics;

  const copyInsightsMarkdown = useCallback(() => {
    const lines: string[] = [
      '## Performance Summary',
      `- Net PnL: ${currencyFormatter.format(summary.netPL)}`,
      `- Win rate: ${summary.winRate.toFixed(1)}%`,
      `- Expectancy: ${currencyFormatter.format(summary.expectancy)}`
    ];
    if (computedInsights.length) {
      lines.push('', '### Highlights');
      computedInsights.slice(0, 6).forEach((ins) => {
        lines.push(`- **${sanitizeForShare(ins.title)}** � ${sanitizeForShare(ins.detail)}`);
      });
    }
    const payload = lines.join('\n');
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(payload).catch(() => {
        console.warn('Failed to copy insights to clipboard');
      });
    }
  }, [computedInsights, currencyFormatter, summary.expectancy, summary.netPL, summary.winRate]);

  const retentionStats = useMemo(() => {
    if (!normalizedTrades.length) return null;
    const ordered = [...normalizedTrades].sort((a, b) => {
      const aTime = (a.closeAt ?? a.openAt)?.getTime() ?? 0;
      const bTime = (b.closeAt ?? b.openAt)?.getTime() ?? 0;
      return bTime - aTime;
    });
    const latest = ordered[0];
    const lastDate = latest?.closeAt ?? latest?.openAt ?? null;
    const daysSince = lastDate ? differenceInCalendarDays(new Date(), lastDate) : null;
    const consistencyScore = Number.isFinite(summary.consistency) ? Number(summary.consistency.toFixed(1)) : 0;
    const streakLength = streaks.currentStreak;
    const direction = streaks.currentDirection;
    const suggestions: string[] = [];
    if (daysSince !== null && daysSince > 3) {
      suggestions.push(`No journal entries for ${daysSince} day${daysSince === 1 ? '' : 's'}. Schedule a short review to stay engaged.`);
    }
    if (direction === 'down' && streakLength >= 2) {
      suggestions.push('Loss streak spotted. Pause and run your post-trade checklist before the next entry.');
    }
    if (consistencyScore < 60) {
      suggestions.push('Consistency under 60%. Lock in only A-setup trades to lift profitable days.');
    }
    if (canShareReports) {
      suggestions.push('Share a quick recap with your mentor or team to reinforce accountability.');
    } else {
      suggestions.push('Upgrade to enable sharing weekly recaps with accountability partners.');
    }
    return {
      daysSinceLast: daysSince,
      consistencyScore,
      streakDirection: direction,
      streakLength,
      suggestions: suggestions.slice(0, 3),
    };
  }, [normalizedTrades, summary.consistency, streaks.currentDirection, streaks.currentStreak, canShareReports]);

  const sltpSuggestion = useMemo(() => {
    if (!normalizedTrades.length) return null;
    const rr = summary.avgLoss ? Math.max(0.5, Number((Math.abs(summary.avgLoss) ? summary.avgWin / Math.abs(summary.avgLoss || 1) : 1).toFixed(2))) : 1;
    const note = rr >= 1.5
      ? 'Your winners already cover risk. Focus on repeating high-quality setups.'
      : 'Aim for higher reward-to-risk entries (>1.5R) to lift expectancy.';
    return { recommendedRR: rr, note };
  }, [normalizedTrades.length, summary.avgLoss, summary.avgWin]);

  const monthDays = useMemo(() => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    return eachDayOfInterval({ start, end });
  }, [calendarMonth]);

  const daySummary = useMemo(() => {
    return (date: Date) => {
      const key = format(date, 'yyyy-MM-dd');
      return patterns.calMap[key] ?? { trades: 0, net: 0 };
    };
  }, [patterns.calMap]);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
    if (saved) setPsychNote(saved);
  }, [storageKey]);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(storageKey, psychNote);
  }, [psychNote, storageKey]);
  const [pinnedTips, setPinnedTips] = useState<string[]>([]);
  const [pendingDeletes, setPendingDeletes] = useState<{ id: string; trade: Trade; timeoutId: number }[]>([]);
  const [undoVisible, setUndoVisible] = useState(false);
  const [suggestedTagsMap, setSuggestedTagsMap] = useState<Record<string, string[]>>({});
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /* ---------------------------
     Main JSX
     --------------------------- */
  return (
    <div className="space-y-6 pb-10 max-h-full overflow-y-auto max-w-full overflow-x-hidden">
      <Card className="overflow-hidden border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-xl">
        <div className="h-1 w-full" style={{ backgroundImage: activeTabConfig.accent }} />
        <CardContent className="flex flex-col gap-5 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-slate-400">
              <span>Journal</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white">{activeTabConfig.label}</span>
            </div>
            <h1 className="text-2xl font-semibold text-white sm:text-3xl">Trading Journal</h1>
            <p className="max-w-2xl text-sm text-slate-300">
              Keep every execution, reflection, and improvement in sync with your analytics, playbook, and risk dashboards.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
            <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-xs text-slate-300 sm:w-auto">
              <span className="uppercase tracking-wide text-slate-500">Projected risk</span>
              <span className="text-sm font-semibold text-white">{currencyFormatter.format(projectedRisk || 0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {Toolbar}

      <Tabs value={subTab} onValueChange={(v) => setSubTab(v as SubTab)} className="w-full">
        <div className="w-full overflow-x-auto pb-2">
          <TabsList className="flex w-max gap-2 pr-4 sm:flex-wrap">
            {TAB_CONFIG.map((tab) => {
              const isActive = subTab === tab.value;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="group flex min-w-[140px] items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 data-[state=active]:border-white/20 data-[state=active]:bg-white/15 data-[state=active]:text-white data-[state=active]:shadow-lg"
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#0f1319]/40 text-slate-300 transition group-data-[state=active]:text-white"
                    style={isActive ? { backgroundImage: tab.accent } : undefined}
                  >
                    {tab.icon}
                  </span>
                  <span className="truncate flex min-w-0 items-center gap-1">
                    {tab.label}
                    {tab.locked ? <span className="text-[9px] uppercase tracking-wide text-amber-400">Upgrade</span> : null}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
      </Tabs>

      {/* Journal */}
      {subTab === "journal" && (
        <>
          {(trimmedCount > 0 || duplicateCount > 0) && (
            <Card className="border border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10">
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
                    <Shield className="h-4 w-4" /> Data hygiene applied
                  </div>
                  <p className="text-xs text-amber-100/80">
                    {trimmedCount > 0 ? `${trimmedCount} older trade${trimmedCount === 1 ? '' : 's'} hidden to honour your ${storageLimitLabel} retention window.` : null}
                    {trimmedCount > 0 && duplicateCount > 0 ? ' ' : ''}
                    {duplicateCount > 0 ? `${duplicateCount} duplicate journal entr${duplicateCount === 1 ? 'y' : 'ies'} ignored to keep analytics accurate.` : null}
                  </p>
                  {trimmedCount > 0 && storageCutoff && (
                    <p className="text-[10px] text-amber-200/70">
                      Oldest visible entry from {format(storageCutoff, 'dd MMM yyyy')}.
                    </p>
                  )}
                </div>
                {planLimits.tradeStorageDays > 0 && (
                  <CompactUpgradePrompt currentPlan={effectivePlan as any} feature="Extended journal history" onUpgrade={() => { }} className="bg-transparent p-0" />
                )}
              </CardContent>
            </Card>
          )}
          {retentionStats && (
            <Card className="w-full overflow-hidden border border-white/10 bg-white/5 dark:bg-black/30">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                      <Activity className="h-4 w-4" /> Retention coach
                    </div>
                    <p className="text-xs text-zinc-400">
                      Stay consistent to lift trader retention and keep your analytics trustworthy.
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs text-zinc-300">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {retentionStats.daysSinceLast === null ? 'No trades logged yet' : retentionStats.daysSinceLast === 0 ? 'Last entry today' : `${retentionStats.daysSinceLast} day${retentionStats.daysSinceLast === 1 ? '' : 's'} since last entry`}</span>
                      <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Consistency {retentionStats.consistencyScore.toFixed(1)}%</span>
                      <span className="flex items-center gap-1"><Flag className="h-3 w-3" /> Streak {retentionStats.streakDirection === 'down' ? '-' : ''}{retentionStats.streakLength}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <ul className="space-y-2 text-xs text-zinc-300">
                      {retentionStats.suggestions.map((tip, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          <Card className="w-full overflow-hidden border border-white/10 bg-white/5 dark:bg-black/30">
            <CardContent className="p-0">
              <div className="px-4 pt-4 pb-2 text-xs text-zinc-400">
                Showing {sorted.length} trade{sorted.length === 1 ? "" : "s"} {selectedDay ? `- filtered ${format(selectedDay, "dd MMM yyyy")}` : ""}
              </div>
              <div className="px-4 pb-2 text-[11px] text-zinc-500">
                Tip: Use strategy tags, SL/TP optimizer, bulk actions and the quick review checklist to speed up journaling.
              </div>
              <div className="px-4 overflow-x-auto">
                <div className="min-w-[720px]">
                  <div className="hidden md:grid md:grid-cols-[1.3fr,1fr,1fr,1.3fr,1fr,auto] gap-3 text-muted-foreground text-xs border-b border-white/10 py-2">
                    <div>Date</div>
                    <div>Symbol</div>
                    <div>Outcome</div>
                    <div>Strategy / Tags</div>
                    <div>Note</div>
                    <div className="text-right">Actions</div>
                  </div>
                  <div className="divide-y divide-white/10">
                    {sorted.length ? (
                      sorted.map((t) => <JournalRow key={getTradeId(t)} trade={t} />)
                    ) : (
                      <div className="py-10 text-center text-zinc-400">No trades found.</div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </>
      )}

      {/* Insights */}
      {subTab === "insights" && (
        canUseAdvancedAnalytics ? (
          <Card className="w-full overflow-hidden border border-white/10 bg-white/5 dark:bg-black/30">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="h-5 w-5" />
                <h3 className="font-semibold">AI & Heuristic Insights</h3>
                <div className="ml-auto flex items-center gap-2">
                  <Button variant="ghost" onClick={copyInsightsMarkdown}>
                    <Clipboard className="h-4 w-4 mr-2" /> Copy MD
                  </Button>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {computedInsights.map(ins => (
                  <div key={ins.id} className="min-w-0 rounded-lg border border-white/10 p-4 bg-white/5 dark:bg-black/30 flex flex-col gap-2">
                    <div className="text-sm font-semibold">{ins.title}</div>
                    <p className="text-xs text-muted-foreground">{ins.detail}</p>
                    <div className="h-2 w-full bg-white/10 rounded">
                      <div className="h-2 rounded bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, ins.score ?? 0))}%` }} />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button variant="ghost" onClick={() => navigator.clipboard.writeText(sanitizeForShare(`${ins.title} - ${ins.detail}`))}>Copy</Button>
                      <Button variant="secondary" onClick={() => setPinnedTips(p => p.includes(ins.detail) ? p : [ins.detail, ...p])}>Pin</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <CompactUpgradePrompt currentPlan={effectivePlan as any} feature="Advanced analytics" onUpgrade={() => { }} className="max-w-xl mx-auto" />
        )
      )}

      {/* Patterns */}
      {subTab === "patterns" && (
        canUsePatterns ? (
          <div className="space-y-6">
            <Card className="w-full overflow-hidden border border-white/10 bg-white/5 dark:bg-black/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Strategy Performance Analysis
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Detailed breakdown of your trading strategies and their effectiveness
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {patterns.stratMap && Object.entries(patterns.stratMap).map(([strategy, data]) => (
                    <div key={strategy} className="min-w-0 p-4 bg-muted/50 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-sm">{strategy}</h4>
                        <Badge variant={data.netPL >= 0 ? "default" : "destructive"}>
                          {data.netPL >= 0 ? "Profit" : "Loss"}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Trades:</span>
                          <span className="font-medium">{data.trades}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Win Rate:</span>
                          <span className="font-medium">{data.trades > 0 ? ((data.wins / data.trades) * 100).toFixed(1) : 0}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>P&L:</span>
                          <span className={`font-medium ${data.netPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${data.netPL.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!patterns.stratMap || Object.keys(patterns.stratMap).length === 0) && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No strategy data available</p>
                      <p className="text-sm">Start tagging your trades with strategies to see performance analysis</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="w-full overflow-hidden rounded-2xl shadow-md border bg-[#0f1319] border-[#202830]">
              <CardContent className="p-5 space-y-6">
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">Top Symbols</h4>
                    <div className="space-y-2">
                      {patterns.topSymbols.length ? patterns.topSymbols.map(s => (
                        <div key={s.symbol} className="min-w-0 flex items-center justify-between rounded-md bg-[#0f1319]/50 border border-[#0f1319] px-3 py-2 text-sm">
                          <span className="font-medium">{s.symbol}</span>
                          <span className="text-xs text-zinc-300">{s.trades} trades - {s.winRate.toFixed(0)}% WR - <span className={s.netPL >= 0 ? "text-green-400" : "text-red-400"}>${s.netPL.toFixed(2)}</span></span>
                        </div>
                      )) : <p className="text-zinc-400 text-sm">No data</p>}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">By Day of Week</h4>
                    <div className="space-y-2">
                      {(Object.entries(patterns.byDOW ?? {}) as Array<[string, { trades: number; pl: number }]>).map(([dow, stats]) => (
                        <div key={dow} className="min-w-0 flex items-center justify-between rounded-md bg-[#0f1319]/50 border border-[#0f1319] px-3 py-2 text-sm">
                          <span className="font-medium">{dow}</span>
                          <span className={stats.pl >= 0 ? "text-green-400" : "text-red-400"}>${stats.pl.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">Session Performance (UTC)</h4>
                    <div className="space-y-2">
                      {(Object.entries(patterns.sessions ?? {}) as Array<[string, { count: number; pl: number }]>).map(([name, stats]) => (
                        <div key={name} className="min-w-0 flex items-center justify-between rounded-md bg-[#0f1319]/50 border border-[#0f1319] px-3 py-2 text-sm capitalize">
                          <span className="font-medium">{name}</span>
                          <span className="text-xs text-zinc-300">{stats.count} trades - <span className={stats.pl >= 0 ? "text-green-400" : "text-red-400"}>${stats.pl.toFixed(2)}</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white mb-2">Hourly Performance (UTC)</h4>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 lg:grid-cols-24 gap-1 sm:gap-2">
                    {patterns.hours.map((h, idx) => {
                      const bg = h.pl >= 0 ? `bg-emerald-600/15` : `bg-red-600/15`;
                      return (
                        <div key={idx} className={`p-1 sm:p-2 rounded border border-zinc-800 text-[10px] sm:text-xs text-zinc-200 ${bg}`}>
                          <div className="font-semibold">{idx}:00</div>
                          <div className="text-[9px] sm:text-[11px] text-zinc-300">{h.trades} trades</div>
                          <div className={`${h.pl >= 0 ? "text-green-400" : "text-red-400"} text-[10px] sm:text-sm`}>${h.pl.toFixed(2)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-[#0f1319]/40 rounded p-4 border border-zinc-800">
                    <h5 className="text-sm text-zinc-200 mb-2">Equity Curve</h5>
                    {mounted ? <div className="w-full h-48 md:h-64"><Line data={charts.pnp} options={{ responsive: true, maintainAspectRatio: false }} /></div> : <div className="h-48 md:h-64" />}
                  </div>
                  <div className="bg-[#0f1319]/40 rounded p-4 border border-zinc-800">
                    <h5 className="text-sm text-zinc-200 mb-2">Rolling Win Rate</h5>
                    {mounted ? <div className="w-full h-48 md:h-64"><Line data={charts.rollingWinData} options={{ responsive: true, maintainAspectRatio: false }} /></div> : <div className="h-48 md:h-64" />}
                  </div>
                </div>
                <div className="bg-[#0f1319]/40 rounded p-4 border border-zinc-800">
                  <h5 className="text-sm text-zinc-200 mb-2">PnL Distribution</h5>
                  {mounted ? <div className="w-full h-48 md:h-64"><Bar data={charts.pnlHistogram} options={{ responsive: true, maintainAspectRatio: false }} /></div> : <div className="h-48 md:h-64" />}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <CompactUpgradePrompt currentPlan={effectivePlan as any} feature="Pattern analytics" onUpgrade={() => { }} className="max-w-xl mx-auto" />
        )
      )}

      {/* Forecast */}
      {!canUseForecast && subTab === 'forecast' && (
        <CompactUpgradePrompt currentPlan={effectivePlan as any} feature="AI Forecast" onUpgrade={() => { }} className="max-w-xl mx-auto" />
      )}
      {subTab === "forecast" && canUseForecast && (
        <Card className="w-full overflow-hidden rounded-2xl shadow-md border bg-[#0f1319] border-[#202830]">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-zinc-200">
              <ArrowUpRight className="h-5 w-5" />
              <h3 className="font-semibold">Forecast & Pattern Prediction (Heuristic)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <HeuristicForecast trades={trades as Trade[]} summary={summary} />
              <div className="rounded-lg border border-zinc-800 p-4 bg-[#0f1319]/50">
                <h5 className="text-sm text-zinc-300">Actionable suggestion</h5>
                <p className="mt-2 text-white">Combine the probability shown with your plan — do not rely only on this. This is not financial advice.</p>
                <div className="mt-4 text-xs text-zinc-400">For a production-grade forecast, integrate a trained model server-side and surface calibrated probabilities here.</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Optimizer */}
      {!canUseOptimizer && subTab === 'optimizer' && (
        <CompactUpgradePrompt currentPlan={effectivePlan as any} feature="SL/TP Optimizer" onUpgrade={() => { }} className="max-w-xl mx-auto" />
      )}
      {subTab === "optimizer" && canUseOptimizer && (
        <Card className="w-full overflow-hidden rounded-2xl shadow-md border bg-[#0f1319] border-[#202830]">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-zinc-200"><Target className="h-5 w-5" /><h3 className="font-semibold">SL/TP Optimization</h3></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-zinc-800 p-4 bg-[#0f1319]/50">
                <div className="text-sm text-zinc-300">Global suggested RR</div>
                <div className="text-2xl text-white my-2">{sltpSuggestion ? `${sltpSuggestion.recommendedRR}R` : ""}</div>
                <div className="text-xs text-zinc-400">{sltpSuggestion?.note}</div>
                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" onClick={() => applySltpToSelected(sltpSuggestion?.recommendedRR ?? 1)}>Apply to selected</Button>
                  <Button variant="ghost" onClick={() => alert("Heuristic: uses average wins/losses. Use backtests or model-based optimizer for production.")}>Explain</Button>
                </div>
              </div>
              <div className="rounded-lg border border-zinc-800 p-4 bg-[#0f1319]/50">
                <div className="text-sm text-zinc-300">Per-strategy suggestions</div>
                <div className="mt-2 space-y-2">
                  {(Object.entries(patterns.stratMap ?? {}) as Array<[string, { trades?: number; wins?: number; losses?: number; netPL?: number; avgRR?: number | null }]>).map(([name, stats]) => {
                    const tradeCount = stats.trades ?? 0;
                    const netPl = stats.netPL ?? 0;
                    const recommended = Math.max(1, Math.round(((netPl / Math.max(1, tradeCount)) / (Math.abs(summary.avgLoss) || 1)) * 10) / 10 || 1);
                    return (
                      <div key={name} className="rounded p-2 bg-[#0f1319]/40 border border-zinc-800 flex justify-between items-center text-sm">
                        <div>
                          <div className="font-medium">{name}</div>
                          <div className="text-xs text-zinc-400">{tradeCount} trades - WR: {tradeCount ? (((stats.wins ?? 0) / tradeCount) * 100).toFixed(1) : "0"}%</div>
                        </div>
                        <div className="flex gap-2">
                          <div className="text-xs text-zinc-200">Suggest {recommended}R</div>
                          <Button variant="ghost" onClick={() => applySltpToSelected(recommended)}>Apply</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prop-Firm */}
      {!canUsePropDesk && subTab === 'prop' && (
        <CompactUpgradePrompt currentPlan={effectivePlan as any} feature="Prop-Firm Dashboard" onUpgrade={() => { }} className="max-w-xl mx-auto" />
      )}
      {subTab === "prop" && canUsePropDesk && <PropTracker trades={trades as Trade[]} />}

      {/* Psychology */}
      {subTab === "psychology" && (
        <Card className="w-full overflow-hidden rounded-2xl shadow-md border bg-[#0f1319] border-[#202830]">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2"><Activity className="h-5 w-5" /><h3 className="font-semibold">Psychology & Behavior</h3></div>
            <div className="flex flex-wrap gap-2">
              {moods.map(m => <button key={m} className="px-3 py-1 rounded-full bg-[#0f1319] border border-zinc-700 text-xs text-zinc-200" onClick={() => addMoodStamp(m)}>{m}</button>)}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <textarea className="w-full min-h-[180px] rounded-md bg-[#0f1319] text-zinc-100 border border-zinc-700 p-3 text-sm" placeholder="Free-write journaling..." value={psychNote} onChange={(e) => setPsychNote(e.target.value)} />
                <div className="flex gap-2 justify-end mt-2">
                  <Button variant="secondary" onClick={() => setPsychNote("")}><X className="h-4 w-4 mr-2" />Clear</Button>
                  <Button variant="secondary" onClick={() => { alert("Saved locally."); }}><Save className="h-4 w-4 mr-2" />Save</Button>
                </div>
              </div>
              <div>
                <div className="bg-[#0f1319]/40 rounded p-3 border border-zinc-800">
                  <h5 className="text-sm text-zinc-300">Behavioral Insights</h5>
                  <div className="mt-2 text-xs text-zinc-400">Max win streak: {streaks.maxWinStreak} - Max loss streak: {streaks.maxLossStreak}</div>
                  <div className="mt-2 text-xs text-zinc-400">Avg trade time: {summary.avgLengthMin.toFixed(1)} min - Sharpe-like: {summary.sharpe.toFixed(2)}</div>
                  {revengeDetector.flagged ? <div className="mt-3 p-2 bg-red-900/30 rounded text-xs text-red-300">! {revengeDetector.reason}</div> : null}
                </div>
                <div className="mt-4 bg-[#0f1319]/40 rounded p-3 border border-zinc-800">
                  <h5 className="text-sm text-zinc-300">Guided Prompts</h5>
                  <div className="mt-2 text-xs text-zinc-200">{randomPrompt()}</div>
                  <div className="mt-3"><Button variant="secondary" onClick={() => setPsychNote(prev => prev + "\n" + randomPrompt())}>Add prompt to note</Button></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar */}
      {subTab === "calendar" && (
        <Card className="w-full overflow-hidden rounded-2xl shadow-md border bg-[#0f1319] border-[#202830]">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3"><CalendarIcon /><h3 className="font-semibold">Calendar & Timeline</h3>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="ghost" onClick={() => setCalendarMonth(m => subMonths(m, 1))}>Prev</Button>
                <div className="text-sm text-zinc-300">{format(calendarMonth, "MMMM yyyy")}</div>
                <Button variant="ghost" onClick={() => setCalendarMonth(m => addMonths(m, 1))}>Next</Button>
              </div>
            </div>
            <div className="bg-[#0f1319]/40 rounded-lg p-4 border border-zinc-800">
              <h4 className="text-sm font-semibold text-white mb-3">Weekly Net PnL Summary</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map(weekNum => {
                  const monthStart = startOfMonth(calendarMonth);
                  const weekStart = new Date(monthStart);
                  weekStart.setDate(monthStart.getDate() + (weekNum - 1) * 7);
                  const weekEnd = new Date(weekStart);
                  weekEnd.setDate(weekStart.getDate() + 6);
                  const weekTrades = tradesTyped.filter(t => {
                    const tradeDate = new Date(t.openTime as any);
                    return tradeDate >= weekStart && tradeDate <= weekEnd;
                  });
                  const weekPnL = weekTrades.reduce((sum, t) => sum + parsePL(t.pnl), 0);
                  const isProfitable = weekPnL >= 0;
                  return (
                    <div key={weekNum} className="bg-[#0f1319]/50 rounded p-3 border border-zinc-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-zinc-300">Week {weekNum}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${isProfitable ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>
                          {isProfitable ? 'Profit' : 'Loss'}
                        </span>
                      </div>
                      <div className={`text-lg font-bold ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                        ${weekPnL.toFixed(2)}
                      </div>
                      <div className="text-xs text-zinc-400 mt-1">
                        {weekTrades.length} trades
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d")}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {monthDays.map(d => {
                const ds = daySummary(d);
                const net = ds.net;
                const bg = net > 0 ? "bg-emerald-600/15" : net < 0 ? "bg-red-600/15" : "bg-zinc-800/10";
                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => { setSelectedDay(prev => prev && isSameDay(prev, d) ? null : d); setSubTab("journal"); }}
                    className={`p-1 sm:p-3 rounded border ${isSameDay(d, selectedDay ?? new Date(0)) ? "border-green-500" : "border-zinc-800"} ${bg} text-left`}
                    data-track="journal_calendar_day_click"
                    data-track-meta={`{"date":"${format(d, "yyyy-MM-dd")}","trades":${ds.trades}}`}
                    title={`${ds.trades} trade(s) - ${net >= 0 ? "+" : ""}${net.toFixed(2)} USD`}
                  >
                    <div className="text-[10px] sm:text-xs text-zinc-300">{format(d, "dd")}</div>
                    <div className="text-[9px] sm:text-[11px] text-zinc-200">{ds.trades} trades</div>
                    <div className={`text-[9px] sm:text-[11px] ${net >= 0 ? "text-green-400" : "text-red-400"}`}>${net.toFixed(0)}</div>
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-zinc-400">Click a day to filter Journal. Use calendar to spot streaks, cluster risk events and outlier days.</div>
          </CardContent>
        </Card>
      )}

      {/* Review */}
      {subTab === "review" && (
        <Card className="w-full overflow-hidden border border-white/10 bg-white/5 dark:bg-black/30">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2"><FileText className="h-5 w-5" /><h3 className="font-semibold">Weekly Review</h3></div>
            {(() => {
              const now = new Date();
              const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              const recent = (tradesTyped || []).filter((t: Trade) => {
                const d = new Date((t.closeTime || t.openTime || now) as any);
                return d >= sevenDaysAgo && d <= now;
              });
              const pnl = recent.reduce((s: number, t: Trade) => s + parsePL(t.pnl), 0);
              const wins = recent.filter(t => (t.outcome || '').toLowerCase() === 'win').length;
              const losses = recent.filter(t => (t.outcome || '').toLowerCase() === 'loss').length;
              const wr = recent.length ? (wins / recent.length) * 100 : 0;
              let peak = 0, eq = 0, maxDD = 0;
              recent.forEach(t => { eq += parsePL(t.pnl); peak = Math.max(peak, eq); maxDD = Math.max(maxDD, peak - eq); });
              const best = [...recent].sort((a, b) => parsePL(b.pnl) - parsePL(a.pnl))[0];
              const worst = [...recent].sort((a, b) => parsePL(a.pnl) - parsePL(b.pnl))[0];
              const topNotes = computedInsights.slice(0, 3);
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-lg border border-white/10 p-4">
                      <div className="text-sm font-semibold mb-1">Net PnL</div>
                      <div className={`text-2xl font-semibold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>${pnl.toFixed(2)}</div>
                    </div>
                    <div className="rounded-lg border border-white/10 p-4">
                      <div className="text-sm font-semibold mb-1">Win / Loss</div>
                      <div className="text-sm">{wins} / {losses} ({wr.toFixed(1)}%)</div>
                    </div>
                    <div className="rounded-lg border border-white/10 p-4">
                      <div className="text-sm font-semibold mb-1">Max drawdown</div>
                      <div className="text-sm">${maxDD.toFixed(2)}</div>
                    </div>
                    <div className="rounded-lg border border-white/10 p-4">
                      <div className="text-sm font-semibold mb-1">Best / Worst</div>
                      <div className="text-sm">{best ? `${best.symbol ?? 'N/A'} $${parsePL(best.pnl).toFixed(2)}` : '--'}</div>
                      <div className="text-sm">{worst ? `${worst.symbol ?? 'N/A'} $${parsePL(worst.pnl).toFixed(2)}` : '--'}</div>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-white/10 p-4">
                      <div className="text-sm font-semibold mb-2">Highlights</div>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {topNotes.length ? topNotes.map((i) => (<li key={i.id}>{i.title}: {i.detail}</li>)) : (<li>Keep executing your plan consistently.</li>)}
                      </ul>
                    </div>
                    <div className="rounded-lg border border-white/10 p-4">
                      <div className="text-sm font-semibold mb-2">Next actions</div>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {topNotes.length ? topNotes.map((i) => (<li key={i.id}>{i.title}: {i.detail}</li>)) : (<li>Keep executing your plan consistently.</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Risk */}
      {subTab === "risk" && (
        canUseRiskTab ? (
          <Card className="w-full overflow-hidden border border-white/10 bg-white/5 dark:bg-black/30">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2"><Target className="h-5 w-5" /><h3 className="font-semibold">Risk Budget</h3></div>
              {effectivePlan === 'starter' && (accountBalance === '' || typeof accountBalance !== 'number') && (
                <div className="p-3 rounded border border-yellow-600 bg-yellow-900/30 text-yellow-200 text-sm">
                  Starter plan: enter your current live account size above to enable risk calculations.
                </div>
              )}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="p-3 rounded bg-white/5 dark:bg-black/20 border border-white/10">
                  <div className="text-xs text-muted-foreground mb-1">Account balance</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">$</span>
                    <input type="number" min={100} step={50} value={accountBalance === '' ? '' : Number(accountBalance)} onChange={(e) => setAccountBalance(e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-32 bg-transparent border rounded px-2 py-1 border-white/10" />
                  </div>
                </div>
                <div className="p-3 rounded bg-white/5 dark:bg-black/20 border border-white/10">
                  <div className="text-xs text-muted-foreground mb-1">Risk per trade</div>
                  <div className="flex items-center gap-2">
                    <input type="range" min={0.25} max={3} step={0.25} value={riskPercent} onChange={(e) => setRiskPercent(parseFloat(e.target.value))} className="w-full" />
                    <span className="text-sm font-medium">{riskPercent.toFixed(2)}%</span>
                  </div>
                </div>
                <div className="p-3 rounded bg-white/5 dark:bg-black/20 border border-white/10">
                  <div className="text-xs text-muted-foreground mb-1">Recommended daily loss</div>
                  <div className="text-sm">{(() => { const bal = typeof accountBalance === 'number' ? accountBalance : 0; const pct = effectivePlan === 'starter' ? 2 : 1.5; return `$${(bal * (pct / 100)).toFixed(0)} (${pct}% of balance)`; })()}</div>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-white/10 p-4">
                  <div className="text-sm text-muted-foreground">Per-trade dollar risk (1R)</div>
                  <div className="text-2xl font-semibold">{(() => { const bal = typeof accountBalance === 'number' ? accountBalance : 0; return `$${(bal * (riskPercent / 100)).toFixed(2)}`; })()}</div>
                </div>
                <div className="rounded-lg border border-white/10 p-4">
                  <div className="text-sm text-muted-foreground">Max lots guidance (heuristic)</div>
                  <div className="text-xs text-muted-foreground">Use broker pip value to convert 1R to lots for your symbol.</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <CompactUpgradePrompt currentPlan={effectivePlan as any} feature="Risk management toolkit" onUpgrade={() => { }} className="max-w-xl mx-auto" />
        )

      )}

      {/* Mistakes (Pro) */}
      {subTab === "mistakes" && (
        canUseMistakeAnalyzer ? (
          <Card className="w-full overflow-hidden border border-white/10 bg-white/5 dark:bg-black/30">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /><h3 className="font-semibold">Mistake Analyzer</h3></div>
              {(() => {
                const by = (key: 'strategy' | 'symbol') => {
                  const map = new Map<string, number>();
                  tradesTyped.forEach(t => { const k = String((t as any)[key] || 'Unknown'); map.set(k, (map.get(k) || 0) + parsePL(t.pnl)); });
                  return Array.from(map.entries()).sort((a, b) => a[1] - b[1]).slice(0, 3);
                };
                const byHour = () => {
                  const map = new Map<number, number>();
                  tradesTyped.forEach(t => { const d = new Date((t.closeTime || t.openTime || '') as any); const h = d.getHours(); map.set(h, (map.get(h) || 0) + parsePL(t.pnl)); });
                  return Array.from(map.entries()).sort((a, b) => a[1] - b[1]).slice(0, 3);
                };
                const worstStrats = by('strategy');
                const worstSymbols = by('symbol');
                const worstHours = byHour();
                return (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-white/10 p-4">
                      <div className="text-sm font-semibold mb-2">Top recurring losses by strategy</div>
                      <ul className="text-sm space-y-1">{worstStrats.map(([k, v]) => (<li key={k} className="flex justify-between"><span>{k}</span><span className={v < 0 ? 'text-red-400' : 'text-emerald-400'}>${v.toFixed(2)}</span></li>))}</ul>
                    </div>
                    <div className="rounded-lg border border-white/10 p-4">
                      <div className="text-sm font-semibold mb-2">Worst symbols</div>
                      <ul className="text-sm space-y-1">{worstSymbols.map(([k, v]) => (<li key={k} className="flex justify-between"><span>{k}</span><span className={v < 0 ? 'text-red-400' : 'text-emerald-400'}>${v.toFixed(2)}</span></li>))}</ul>
                    </div>
                    <div className="rounded-lg border border-white/10 p-4 md:col-span-2">
                      <div className="text-sm font-semibold mb-2">Risky trading hours (UTC)</div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        {worstHours.map(([h, v]) => (
                          <div key={h} className="rounded border border-white/10 px-2 py-1 flex items-center justify-between"><span>{h}:00</span><span className={v < 0 ? 'text-red-400' : 'text-emerald-400'}>${v.toFixed(2)}</span></div>
                        ))}
                      </div>
                      <div className="mt-3 text-xs text-muted-foreground">Set cooldowns or avoid these windows to reduce tilt.</div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        ) : (
          <CompactUpgradePrompt currentPlan={effectivePlan as any} feature="Mistake Analyzer" onUpgrade={() => { }} className="max-w-xl mx-auto" />
        )
      )}

      {/* Playbook (Plus) */}
      {subTab === "playbook" && (
        canUsePlaybook ? (
          <Card className="w-full overflow-hidden border border-white/10 bg-white/5 dark:bg-black/30">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2"><Star className="h-5 w-5" /><h3 className="font-semibold">Strategy Playbook</h3></div>
                <Button size="sm" variant="secondary" onClick={() => { if (playbooks.length < playbookLimit) setPlaybooks([{ id: String(Date.now()), name: 'New Setup', entry: '', exit: '', notes: '' }, ...playbooks]); }} disabled={playbooks.length >= playbookLimit}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
              {playbooks.length === 0 && <div className="text-sm text-muted-foreground">No playbooks yet.</div>}
              <div className="grid md:grid-cols-2 gap-4">
                {playbooks.map((p, idx) => (
                  <div key={p.id} className="rounded-lg border border-white/10 p-4 bg-white/5 dark:bg-black/30">
                    <div className="flex items-center gap-2 mb-2">
                      <input className="flex-1 bg-transparent border border-white/10 rounded px-2 py-1 text-sm" value={p.name} onChange={(e) => setPlaybooks(playbooks.map(pb => pb.id === p.id ? { ...pb, name: e.target.value } : pb))} />
                      <Button size="sm" variant="ghost" onClick={() => setPlaybooks(playbooks.filter(pb => pb.id !== p.id))}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">Entry rules</div>
                    <textarea className="w-full bg-transparent border border-white/10 rounded px-2 py-1 text-sm mb-2" rows={3} value={p.entry} onChange={(e) => setPlaybooks(playbooks.map(pb => pb.id === p.id ? { ...pb, entry: e.target.value } : pb))} />
                    <div className="text-xs text-muted-foreground mb-1">Exit rules</div>
                    <textarea className="w-full bg-transparent border border-white/10 rounded px-2 py-1 text-sm mb-2" rows={3} value={p.exit} onChange={(e) => setPlaybooks(playbooks.map(pb => pb.id === p.id ? { ...pb, exit: e.target.value } : pb))} />
                    <div className="text-xs text-muted-foreground mb-1">Notes</div>
                    <textarea className="w-full bg-transparent border border-white/10 rounded px-2 py-1 text-sm" rows={2} value={p.notes || ''} onChange={(e) => setPlaybooks(playbooks.map(pb => pb.id === p.id ? { ...pb, notes: e.target.value } : pb))} />
                    <div className="mt-3 text-xs text-muted-foreground">Tip: Pin one setup and focus until it&apos;s consistent.</div>
                  </div>
                ))}
              </div>
              {playbooks.length >= playbookLimit && (
                <div className="text-xs text-yellow-400">Reached playbook limit for your plan. Upgrade to add more.</div>
              )}
            </CardContent>
          </Card>
        ) : (
          <CompactUpgradePrompt currentPlan={effectivePlan as any} feature="Strategy Playbook" onUpgrade={() => { }} className="max-w-xl mx-auto" />
        )
      )}

      {/* Import preview */}
      {importPreview && (
        <Card className="w-full overflow-hidden rounded-2xl shadow-md border bg-[#0f1319] border-[#202830]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-zinc-200">Import preview ({importPreview.length} rows)</div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setImportPreview(null)}>Close</Button>
              </div>
            </div>
            <div className="max-h-64 overflow-auto text-sm">
              <table className="w-full text-left">
                <thead className="text-xs text-zinc-400">
                  <tr>
                    <th>Date</th>
                    <th>Symbol</th>
                    <th>Outcome</th>
                    <th>PnL</th>
                    <th>Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.map((r, i) => (
                    <tr key={i} className="border-t border-zinc-800">
                      <td className="py-1">{fmtDateTime(r.openTime)}</td>
                      <td className="py-1">{r.symbol}</td>
                      <td className="py-1">{r.outcome}</td>
                      <td className="py-1">${parsePL(r.pnl).toFixed(2)}</td>
                      <td className="py-1">{Array.isArray(r.tags) ? r.tags.join(", ") : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

























