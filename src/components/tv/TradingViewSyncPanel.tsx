"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PLAN_LIMITS, normalizePlanType, type PlanType } from "@/lib/planAccess";
import { getTvLimitForPlan, type TvFeatureKey } from "@/lib/tv";
import { useTrade } from "@/context/TradeContext";
import {
  AlertTriangle,
  BarChart3,
  Folder,
  Search,
  Zap,
  Activity,
  ClipboardCheck,
  Sparkles,
} from "lucide-react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const FEATURE_ORDER: TvFeatureKey[] = ["alerts", "backtest", "portfolio", "patterns", "screener", "broker"];

type UsageState = Record<TvFeatureKey, { usage: number; limit: number; unlimited: boolean }>;

interface AlertResult {
  pineScript: string;
  tweaks: string[];
  winRateBoost: number;
  riskNotes: string[];
}

interface BacktestResult {
  equityCurve: number[];
  labels: string[];
  metrics: {
    sharpe: number;
    drawdown: number;
    winRate: number;
    expectancy: number;
  };
  commentary: string[];
}

interface PortfolioResult {
  totalTrades: number;
  avgPnL: number;
  sharpe: number;
  maxDrawdown: number;
  exposure: number;
  notes: string[];
}

interface PatternDetection {
  name: string;
  confidence: number;
  bias: "bullish" | "bearish" | "neutral";
  annotation: string;
}

interface ScreenerRow {
  symbol: string;
  trend: string;
  score: number;
  reason: string;
}

interface ExecuteResult {
  accepted: boolean;
  mode: "paper" | "live";
  reason?: string;
  preview?: { risk: number; rr: number | null; liquidation?: number | null };
}

interface UsagePayload {
  feature: TvFeatureKey;
  usage: number;
  limit: number;
  unlimited: boolean;
  plan?: PlanType;
}

const mapPlanLimit = (plan: PlanType, feature: TvFeatureKey): { limit: number; unlimited: boolean } => {
  const info = getTvLimitForPlan(plan, feature);
  if (info.unlimited) {
    return { limit: -1, unlimited: true };
  }
  return { limit: info.limit, unlimited: false };
};

const createDefaultUsage = (plan: PlanType): UsageState => {
  return FEATURE_ORDER.reduce((acc, feature) => {
    const { limit, unlimited } = mapPlanLimit(plan, feature);
    acc[feature] = { usage: 0, limit, unlimited };
    return acc;
  }, {} as UsageState);
};

const surveyKey = "tv-phase3-survey";

interface TradingViewSyncPanelProps {
  className?: string;
}

export default function TradingViewSyncPanel({ className = "" }: TradingViewSyncPanelProps): React.ReactElement {
  const [plan, setPlan] = useState<PlanType>("starter");
  const [usage, setUsage] = useState<UsageState>(() => createDefaultUsage("starter"));
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [errors, setErrors] = useState<Record<TvFeatureKey, string | null>>({
    alerts: null,
    backtest: null,
    portfolio: null,
    patterns: null,
    screener: null,
    broker: null,
  });

  const [alertText, setAlertText] = useState("");
  const [alertBias, setAlertBias] = useState<"conservative" | "balanced" | "aggressive">("balanced");
  const [alertResult, setAlertResult] = useState<AlertResult | null>(null);
  const [alertLoading, setAlertLoading] = useState(false);

  const [backtestFile, setBacktestFile] = useState<File | null>(null);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [backtestLoading, setBacktestLoading] = useState(false);

  const [portfolioCsv, setPortfolioCsv] = useState("");
  const [portfolioResult, setPortfolioResult] = useState<PortfolioResult | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);

  const [patternSeries, setPatternSeries] = useState("");
  const [patternResult, setPatternResult] = useState<PatternDetection[]>([]);
  const [patternLoading, setPatternLoading] = useState(false);

  const [screenerText, setScreenerText] = useState("");
  const [screenerRows, setScreenerRows] = useState<ScreenerRow[]>([]);
  const [screenerLoading, setScreenerLoading] = useState(false);

  const [orderSymbol, setOrderSymbol] = useState("EURUSD");
  const [orderDirection, setOrderDirection] = useState<"buy" | "sell">("buy");
  const [orderSize, setOrderSize] = useState("1");
  const [orderStop, setOrderStop] = useState("");
  const [orderTarget, setOrderTarget] = useState("");
  const [orderMode, setOrderMode] = useState<"paper" | "live">("paper");
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderResult, setOrderResult] = useState<ExecuteResult | null>(null);

  const [surveyOpen, setSurveyOpen] = useState(false);
  const [surveyFeature, setSurveyFeature] = useState<string>("");

  const { addTrade } = useTrade() as any;

  const refreshUsage = useCallback(async () => {
    setLoadingUsage(true);
    try {
      const res = await fetch("/api/tv/usage", { cache: "no-store" });
      if (!res.ok) throw new Error("Usage request failed");
      const data = await res.json();
      const resolvedPlan = normalizePlanType(data.plan ?? plan);
      setPlan(resolvedPlan);
      const nextUsage = createDefaultUsage(resolvedPlan);
      if (Array.isArray(data.usage)) {
        data.usage.forEach((entry: UsagePayload) => {
          const feature = entry.feature;
          if (feature && nextUsage[feature]) {
            nextUsage[feature] = {
              usage: entry.usage ?? 0,
              limit: entry.limit ?? nextUsage[feature].limit,
              unlimited: Boolean(entry.unlimited),
            };
          }
        });
      }
      setUsage(nextUsage);
    } catch (error) {
      console.error("load usage error", error);
    } finally {
      setLoadingUsage(false);
    }
  }, [plan]);

  useEffect(() => {
    refreshUsage().catch(() => { });
  }, [refreshUsage]);

  const featureDisabled = (feature: TvFeatureKey) => {
    const state = usage[feature];
    if (state.unlimited) return false;
    if (state.limit <= 0) return true;
    return state.usage >= state.limit;
  };

  const featureRemaining = (feature: TvFeatureKey) => {
    const state = usage[feature];
    if (state.unlimited || state.limit === -1) return "Unlimited";
    const remaining = Math.max(0, state.limit - state.usage);
    return `${remaining} left · ${state.usage}/${state.limit}`;
  };

  const updateFeatureUsage = (payload?: UsagePayload) => {
    if (!payload) return;
    setUsage((prev) => ({
      ...prev,
      [payload.feature]: {
        usage: payload.usage ?? prev[payload.feature].usage,
        limit: payload.limit ?? prev[payload.feature].limit,
        unlimited: Boolean(payload.unlimited),
      },
    }));
    if (payload.plan) {
      setPlan(payload.plan);
    }
  };

  const maybeOpenSurvey = (feature: string) => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(surveyKey)) return;
    window.localStorage.setItem(surveyKey, "1");
    setSurveyFeature(feature);
    setSurveyOpen(true);
  };

  const setFeatureError = (feature: TvFeatureKey, message: string | null) => {
    setErrors((prev) => ({ ...prev, [feature]: message }));
  };

  const handleAlertOptimize = async () => {
    if (featureDisabled("alerts")) {
      setFeatureError("alerts", "Upgrade required for alerts");
      return;
    }
    setAlertLoading(true);
    setFeatureError("alerts", null);
    setAlertResult(null);
    try {
      const res = await fetch("/api/tv/alert-optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertText, riskBias: alertBias }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || "Optimization failed");
      }
      const result: AlertResult = {
        pineScript: data.pineScript,
        tweaks: data.tweaks ?? [],
        winRateBoost: data.winRateBoost ?? 0,
        riskNotes: data.riskNotes ?? [],
      };
      setAlertResult(result);
      updateFeatureUsage(data.usage);
      maybeOpenSurvey("AI Alerts");
    } catch (error) {
      setFeatureError("alerts", error instanceof Error ? error.message : "Optimization failed");
    } finally {
      setAlertLoading(false);
    }
  };

  const copyAlert = () => {
    if (!alertResult) return;
    navigator.clipboard.writeText(alertResult.pineScript).catch(() => { });
  };

  const journalAlert = () => {
    if (!alertResult || !addTrade) return;
    addTrade({
      id: `tv-alert-${Date.now()}`,
      symbol: "TV_ALERT",
      direction: "Buy",
      orderType: "Alert",
      openTime: new Date().toISOString(),
      closeTime: "",
      session: "N/A",
      lotSize: 0,
      entryPrice: 0,
      exitPrice: 0,
      stopLossPrice: 0,
      takeProfitPrice: 0,
      pnl: 0,
      outcome: "Pending",
      resultRR: 0,
      duration: "",
      reasonForTrade: `AI optimized alert (${alertBias})`,
      emotion: "Neutral",
      journalNotes: `${alertResult.pineScript}\nTweaks: ${alertResult.tweaks.join(", ")}`,
      reviewed: false,
    });
  };

  const handleBacktest = async () => {
    if (!backtestFile) {
      setFeatureError("backtest", "Upload a CSV first");
      return;
    }
    setBacktestLoading(true);
    setFeatureError("backtest", null);
    setBacktestResult(null);
    try {
      const form = new FormData();
      form.append("csvFile", backtestFile);
      const res = await fetch("/api/tv/backtest-sim", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || "Simulation failed");
      }
      const result: BacktestResult = {
        equityCurve: data.equityCurve ?? [],
        labels: data.labels ?? [],
        metrics: data.metrics ?? { sharpe: 0, drawdown: 0, winRate: 0, expectancy: 0 },
        commentary: data.commentary ?? [],
      };
      setBacktestResult(result);
      updateFeatureUsage(data.usage);
      maybeOpenSurvey("Backtest Simulator");
    } catch (error) {
      setFeatureError("backtest", error instanceof Error ? error.message : "Simulation failed");
    } finally {
      setBacktestLoading(false);
    }
  };

  const journalBacktest = () => {
    if (!backtestResult || !addTrade) return;
    addTrade({
      id: `tv-backtest-${Date.now()}`,
      symbol: "TV_BACKTEST",
      direction: "N/A",
      orderType: "Simulation",
      openTime: new Date().toISOString(),
      closeTime: "",
      session: "N/A",
      lotSize: 0,
      entryPrice: 0,
      exitPrice: 0,
      stopLossPrice: 0,
      takeProfitPrice: 0,
      pnl: 0,
      outcome: "Analysis",
      resultRR: 0,
      duration: "",
      reasonForTrade: "AI Backtest",
      emotion: "Neutral",
      journalNotes: `Sharpe ${backtestResult.metrics.sharpe.toFixed(2)} | DD ${backtestResult.metrics.drawdown.toFixed(2)}% | WR ${backtestResult.metrics.winRate.toFixed(1)}%`,
      reviewed: false,
    });
  };

  const handlePortfolio = async () => {
    if (!portfolioCsv.trim()) {
      setFeatureError("portfolio", "Paste CSV trades first");
      return;
    }
    setPortfolioLoading(true);
    setFeatureError("portfolio", null);
    setPortfolioResult(null);
    try {
      const res = await fetch("/api/tv/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "portfolio", csvText: portfolioCsv }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || "Import failed");
      }
      setPortfolioResult(data.insight as PortfolioResult);
      updateFeatureUsage(data.usage);
      maybeOpenSurvey("Portfolio Hub");
    } catch (error) {
      setFeatureError("portfolio", error instanceof Error ? error.message : "Import failed");
    } finally {
      setPortfolioLoading(false);
    }
  };

  const journalPortfolio = () => {
    if (!portfolioResult || !addTrade) return;
    addTrade({
      id: `tv-portfolio-${Date.now()}`,
      symbol: "TV_PORTFOLIO",
      direction: "N/A",
      orderType: "Import",
      openTime: new Date().toISOString(),
      closeTime: "",
      session: "N/A",
      lotSize: 0,
      entryPrice: 0,
      exitPrice: 0,
      stopLossPrice: 0,
      takeProfitPrice: 0,
      pnl: portfolioResult.avgPnL,
      outcome: "Analysis",
      resultRR: 0,
      duration: "",
      reasonForTrade: "Portfolio insights",
      emotion: "Neutral",
      journalNotes: portfolioResult.notes.join(" | "),
      reviewed: false,
    });
  };

  const handlePatternScan = async () => {
    let series: number[] = [];
    try {
      series = JSON.parse(patternSeries) as number[];
      if (!Array.isArray(series)) throw new Error();
    } catch {
      setFeatureError("patterns", "Provide JSON array of closes, e.g. [1.2,1.3,...]");
      return;
    }
    setPatternLoading(true);
    setFeatureError("patterns", null);
    try {
      const res = await fetch("/api/tv/pattern-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataPoints: series }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Scan failed");
      setPatternResult(data.detections as PatternDetection[]);
      updateFeatureUsage(data.usage);
      maybeOpenSurvey("Pattern Scanner");
    } catch (error) {
      setFeatureError("patterns", error instanceof Error ? error.message : "Scan failed");
    } finally {
      setPatternLoading(false);
    }
  };

  const journalPatterns = () => {
    if (!patternResult.length || !addTrade) return;
    addTrade({
      id: `tv-pattern-${Date.now()}`,
      symbol: "TV_PATTERN",
      direction: "N/A",
      orderType: "Analysis",
      openTime: new Date().toISOString(),
      closeTime: "",
      session: "N/A",
      lotSize: 0,
      entryPrice: 0,
      exitPrice: 0,
      stopLossPrice: 0,
      takeProfitPrice: 0,
      pnl: 0,
      outcome: "Analysis",
      resultRR: 0,
      duration: "",
      reasonForTrade: "Pattern annotations",
      emotion: "Neutral",
      journalNotes: patternResult.map((p) => `${p.name} ${Math.round(p.confidence * 100)}% ${p.bias}`).join(" | "),
      reviewed: false,
    });
  };

  const handleScreener = async () => {
    if (!screenerText.trim()) {
      setFeatureError("screener", "Paste screener notes first");
      return;
    }
    setScreenerLoading(true);
    setFeatureError("screener", null);
    try {
      const res = await fetch("/api/tv/screener-refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screener: screenerText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Refine failed");
      setScreenerRows(data.rows as ScreenerRow[]);
      updateFeatureUsage(data.usage);
      maybeOpenSurvey("Screener Bridge");
    } catch (error) {
      setFeatureError("screener", error instanceof Error ? error.message : "Refine failed");
    } finally {
      setScreenerLoading(false);
    }
  };

  const handleOrderExecute = async () => {
    setOrderLoading(true);
    setFeatureError("broker", null);
    setOrderResult(null);
    try {
      const res = await fetch("/api/tv/execute-trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: orderSymbol,
          direction: orderDirection,
          size: Number(orderSize) || 0,
          stop: orderStop ? Number(orderStop) : undefined,
          target: orderTarget ? Number(orderTarget) : undefined,
          mode: orderMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Execution failed");
      setOrderResult(data.result as ExecuteResult);
      updateFeatureUsage(data.usage);
      maybeOpenSurvey("Trade Executor");
      if (data.result?.accepted && addTrade) {
        addTrade({
          id: `tv-exec-${Date.now()}`,
          symbol: orderSymbol,
          direction: orderDirection === "buy" ? "Buy" : "Sell",
          orderType: orderMode === "live" ? "Live" : "Paper",
          openTime: new Date().toISOString(),
          closeTime: "",
          session: "N/A",
          lotSize: Number(orderSize) || 0,
          entryPrice: 0,
          exitPrice: 0,
          stopLossPrice: orderStop ? Number(orderStop) : 0,
          takeProfitPrice: orderTarget ? Number(orderTarget) : 0,
          pnl: 0,
          outcome: "Pending",
          resultRR: data.result?.preview?.rr ?? 0,
          duration: "",
          reasonForTrade: "AI executor",
          emotion: "Neutral",
          journalNotes: data.result?.reason || "",
          reviewed: false,
        });
      }
    } catch (error) {
      setFeatureError("broker", error instanceof Error ? error.message : "Execution failed");
    } finally {
      setOrderLoading(false);
    }
  };

  const equityChart = useMemo(() => {
    if (!backtestResult) return null;
    const labels = backtestResult.labels.length ? backtestResult.labels : backtestResult.equityCurve.map((_, idx) => String(idx + 1));
    return {
      labels,
      datasets: [
        {
          label: "Equity",
          data: backtestResult.equityCurve,
          borderColor: "#6366f1",
          backgroundColor: "rgba(99,102,241,0.2)",
          tension: 0.25,
        },
      ],
    };
  }, [backtestResult]);

  const planLimits = PLAN_LIMITS[plan];

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-indigo-400" />
          <div>
            <h2 className="text-xl font-semibold">TradingView Sync</h2>
            <p className="text-sm text-gray-400">AI upgrades for your alerts, backtests, portfolios, patterns, screeners, and broker handoff.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Badge variant="outline" className="border border-indigo-500/30 text-indigo-200">
            Plan: {plan.toUpperCase()}
          </Badge>
          {loadingUsage ? <span>Fetching limits…</span> : <span>Alerts allowance: {featureRemaining("alerts")}</span>}
        </div>
      </div>

      <Tabs defaultValue="alerts" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
          <TabsTrigger value="alerts" title="AI Alert Builder">Alerts</TabsTrigger>
          <TabsTrigger value="backtest" title="Backtest Simulator">Backtests</TabsTrigger>
          <TabsTrigger value="portfolio" title="Portfolio Hub">Portfolio</TabsTrigger>
          <TabsTrigger value="patterns" title="Pattern Scanner">Patterns</TabsTrigger>
          <TabsTrigger value="screener" title="Screener Bridge">Screener</TabsTrigger>
          <TabsTrigger value="broker" title="Trade Executor">Executor</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-indigo-400" />
                AI Alert Builder
              </CardTitle>
              <Badge variant="outline">{featureRemaining("alerts")}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={alertBias} onValueChange={(value: any) => setAlertBias(value)}>
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue placeholder="Risk profile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservative risk</SelectItem>
                  <SelectItem value="balanced">Balanced risk</SelectItem>
                  <SelectItem value="aggressive">Aggressive risk</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                value={alertText}
                onChange={(e) => setAlertText(e.target.value)}
                placeholder="Paste TradingView alert message or JSON payload"
                className="min-h-[140px]"
              />
              <div className="flex flex-wrap gap-3">
                <Button disabled={alertLoading || featureDisabled("alerts") || !alertText.trim()} onClick={handleAlertOptimize}>
                  {alertLoading && <span className="mr-2 animate-spin">⏳</span>}
                  Optimize alert
                </Button>
                <Button variant="outline" disabled={!alertResult} onClick={copyAlert}>Copy Pine</Button>
                <Button variant="ghost" disabled={!alertResult} onClick={journalAlert}>Apply to journal</Button>
              </div>
              {errors.alerts && <p className="text-sm text-red-400">{errors.alerts}</p>}
              {alertResult && (
                <div className="space-y-3 rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-4 text-sm">
                  <div className="text-xs uppercase tracking-wide text-indigo-200">AI Suggestions</div>
                  <pre className="whitespace-pre-wrap text-xs text-indigo-100 bg-black/40 rounded p-3 overflow-auto max-h-60">{alertResult.pineScript}</pre>
                  <div className="text-indigo-100">Tweaks: {alertResult.tweaks.join(", ")}</div>
                  <div className="text-indigo-100">Projected win-rate lift: {alertResult.winRateBoost}%</div>
                  <ul className="list-disc list-inside text-indigo-200 text-xs">
                    {alertResult.riskNotes.map((note, idx) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backtest" className="mt-6">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                Backtest Simulator
              </CardTitle>
              <Badge variant="outline">{featureRemaining("backtest")}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input type="file" accept=".csv" onChange={(e) => setBacktestFile(e.target.files?.[0] ?? null)} />
              <Button disabled={backtestLoading || featureDisabled("backtest") || !backtestFile} onClick={handleBacktest}>
                {backtestLoading && <span className="mr-2 animate-spin">⏳</span>}
                Run simulation
              </Button>
              {errors.backtest && <p className="text-sm text-red-400">{errors.backtest}</p>}
              {backtestResult && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-indigo-100">
                    <Stat label="Sharpe" value={backtestResult.metrics.sharpe.toFixed(2)} />
                    <Stat label="Drawdown" value={`${backtestResult.metrics.drawdown.toFixed(2)}%`} />
                    <Stat label="Win rate" value={`${backtestResult.metrics.winRate.toFixed(1)}%`} />
                    <Stat label="Expectancy" value={backtestResult.metrics.expectancy.toFixed(2)} />
                  </div>
                  {equityChart && (
                    <Line
                      data={equityChart}
                      options={{
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: { x: { display: false } },
                      }}
                    />
                  )}
                  <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-100 space-y-1">
                    {backtestResult.commentary.map((line, idx) => (
                      <div key={idx}>• {line}</div>
                    ))}
                  </div>
                  <Button variant="ghost" onClick={journalBacktest}>
                    <ClipboardCheck className="w-4 h-4 mr-2" /> Log to journal
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portfolio" className="mt-6">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Folder className="w-5 h-5 text-sky-400" />
                Portfolio Hub
              </CardTitle>
              <Badge variant="outline">{featureRemaining("portfolio")}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={portfolioCsv}
                onChange={(e) => setPortfolioCsv(e.target.value)}
                placeholder="Paste trading CSV exported from TradingView (headers included)."
                className="min-h-[160px]"
              />
              <Button disabled={portfolioLoading || featureDisabled("portfolio") || !portfolioCsv.trim()} onClick={handlePortfolio}>
                {portfolioLoading && <span className="mr-2 animate-spin">⏳</span>}
                Generate insights
              </Button>
              {errors.portfolio && <p className="text-sm text-red-400">{errors.portfolio}</p>}
              {portfolioResult && (
                <div className="space-y-3 rounded border border-sky-500/30 bg-sky-500/10 p-4 text-sm text-sky-100">
                  <div>Trades analysed: {portfolioResult.totalTrades}</div>
                  <div>Average P/L: {portfolioResult.avgPnL.toFixed(2)}</div>
                  <div>Sharpe: {portfolioResult.sharpe.toFixed(2)} · Max DD: {portfolioResult.maxDrawdown.toFixed(2)}%</div>
                  <div>Model exposure suggestion: {portfolioResult.exposure.toFixed(1)}%</div>
                  <ul className="list-disc list-inside text-xs">
                    {portfolioResult.notes.map((note, idx) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={journalPortfolio}>Sync to journal</Button>
                    <Button variant="outline" onClick={() => navigator.clipboard.writeText(portfolioResult.notes.join("\n"))}>Copy summary</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="mt-6">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-pink-400" />
                Pattern Scanner
              </CardTitle>
              <Badge variant="outline">{featureRemaining("patterns")}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={patternSeries}
                onChange={(e) => setPatternSeries(e.target.value)}
                placeholder='Paste closes as JSON, e.g. [1.234,1.236,1.240]'
                className="min-h-[140px]"
              />
              <Button disabled={patternLoading || featureDisabled("patterns") || !patternSeries.trim()} onClick={handlePatternScan}>
                {patternLoading && <span className="mr-2 animate-spin">⏳</span>}
                Scan patterns
              </Button>
              {errors.patterns && <p className="text-sm text-red-400">{errors.patterns}</p>}
              {patternResult.length > 0 && (
                <div className="space-y-2">
                  {patternResult.map((item, idx) => (
                    <div key={idx} className="rounded border border-pink-500/30 bg-pink-500/10 p-3 text-xs text-pink-100">
                      <div className="font-semibold text-sm text-pink-200">{item.name}</div>
                      <div>Confidence: {(item.confidence * 100).toFixed(1)}%</div>
                      <div>Bias: {item.bias}</div>
                      <div>{item.annotation}</div>
                    </div>
                  ))}
                  <Button variant="ghost" onClick={journalPatterns}>Sync annotations to journal</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="screener" className="mt-6">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-amber-400" />
                Screener Bridge
              </CardTitle>
              <Badge variant="outline">{featureRemaining("screener")}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={screenerText}
                onChange={(e) => setScreenerText(e.target.value)}
                placeholder="Paste TradingView screener exports or comma-separated ideas"
                className="min-h-[140px]"
              />
              <Button disabled={screenerLoading || featureDisabled("screener") || !screenerText.trim()} onClick={handleScreener}>
                {screenerLoading && <span className="mr-2 animate-spin">⏳</span>}
                Refine watchlist
              </Button>
              {errors.screener && <p className="text-sm text-red-400">{errors.screener}</p>}
              {screenerRows.length > 0 && (
                <div className="overflow-x-auto rounded border border-amber-500/30">
                  <table className="w-full text-xs text-amber-100">
                    <thead className="bg-amber-500/10">
                      <tr>
                        <th className="px-3 py-2 text-left">Symbol</th>
                        <th className="px-3 py-2 text-left">Trend</th>
                        <th className="px-3 py-2 text-left">Score</th>
                        <th className="px-3 py-2 text-left">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {screenerRows.map((row, idx) => (
                        <tr key={idx} className="border-t border-amber-500/20">
                          <td className="px-3 py-2 font-semibold">{row.symbol}</td>
                          <td className="px-3 py-2 capitalize">{row.trend}</td>
                          <td className="px-3 py-2">{row.score}</td>
                          <td className="px-3 py-2">{row.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="broker" className="mt-6">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-lime-400" />
                Trade Executor
              </CardTitle>
              <Badge variant="outline">{featureRemaining("broker")}</Badge>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input value={orderSymbol} onChange={(e) => setOrderSymbol(e.target.value.toUpperCase())} placeholder="Symbol" />
                <Select value={orderDirection} onValueChange={(value: any) => setOrderDirection(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Direction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">Buy</SelectItem>
                    <SelectItem value="sell">Sell</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={orderSize} onChange={(e) => setOrderSize(e.target.value)} placeholder="Size (lots)" />
                <Select value={orderMode} onValueChange={(value: any) => setOrderMode(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paper">Paper</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={orderStop} onChange={(e) => setOrderStop(e.target.value)} placeholder="Stop price (optional)" />
                <Input value={orderTarget} onChange={(e) => setOrderTarget(e.target.value)} placeholder="Target price (optional)" />
              </div>
              <Button disabled={orderLoading || featureDisabled("broker") || !orderSymbol || !orderSize} onClick={handleOrderExecute}>
                {orderLoading && <span className="mr-2 animate-spin">⏳</span>}
                Route trade
              </Button>
              {errors.broker && <p className="text-sm text-red-400">{errors.broker}</p>}
              {orderResult && (
                <div className={`rounded border p-3 text-xs ${orderResult.accepted ? "border-lime-500/40 bg-lime-500/10 text-lime-100" : "border-red-500/40 bg-red-500/10 text-red-100"}`}>
                  <div className="font-semibold">{orderResult.accepted ? "Accepted" : "Rejected"}</div>
                  <div>{orderResult.reason}</div>
                  {orderResult.preview && (
                    <div>Risk: ${orderResult.preview.risk.toFixed(2)} · RR: {orderResult.preview.rr ?? "n/a"}</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={surveyOpen} onOpenChange={setSurveyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Beta feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-200">
            <p>
              Did the {surveyFeature || "feature"} feel worth <strong>$15/mo</strong>? Your feedback shapes the next release.
            </p>
            <div className="flex gap-3">
              <Button className="flex-1" onClick={() => setSurveyOpen(false)}>Yes, worth it</Button>
              <Button variant="outline" className="flex-1" onClick={() => setSurveyOpen(false)}>Needs more polish</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-3">
      <div className="text-[10px] uppercase tracking-wide text-emerald-200">{label}</div>
      <div className="text-lg font-semibold text-emerald-100">{value}</div>
    </div>
  );
}
