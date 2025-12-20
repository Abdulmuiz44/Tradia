"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Brain,
  CheckCircle,
  Compass,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useUser } from "@/context/UserContext";
import { CompactUpgradePrompt } from "@/components/UpgradePrompt";
import { useRouter } from "next/navigation";

type PaidPlan = "plus" | "elite";
type NormalizedPlan = PaidPlan | "free" | "pro";

interface ForecastResponse {
  pair: string;
  direction: "Bullish" | "Bearish";
  bull_prob: number;
  signals: Record<string, number | undefined>;
  confidence: number;
  horizon: number;
  interval: string;
  history?: Array<{
    time: string;
    close: number;
    open?: number;
    high?: number;
    low?: number;
    volume?: number;
  }>;
  generated_at?: string;
  disclaimer?: string;
}

const ALL_PAIRS = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD"] as const;

const PLAN_CAPABILITIES: Record<NormalizedPlan, {
  label: string;
  allowedPairs: readonly string[];
  accuracyCap: number;
  refreshMs: number;
  refreshLabel: string;
  chartLimit: number;
  notes: string;
  preview?: boolean;
  hasAccess: boolean;
}> = {
  free: {
    label: "Upgrade Required",
    allowedPairs: [],
    accuracyCap: 0,
    refreshMs: 0,
    refreshLabel: "Upgrade to access",
    chartLimit: 0,
    notes: "Tradia Predict is available for Plus and Elite members only. Upgrade to unlock AI-powered market predictions.",
    preview: false,
    hasAccess: false,
  },
  pro: {
    label: "Upgrade Required",
    allowedPairs: [],
    accuracyCap: 0,
    refreshMs: 0,
    refreshLabel: "Upgrade to access",
    chartLimit: 0,
    notes: "Tradia Predict is available for Plus and Elite members only. Upgrade to unlock AI-powered market predictions.",
    preview: false,
    hasAccess: false,
  },
  plus: {
    label: "Plus Prediction Stream",
    allowedPairs: ALL_PAIRS,
    accuracyCap: 0.9,
    refreshMs: 3 * 60 * 60 * 1000, // 3 hours
    refreshLabel: "Refresh available every 3 hours",
    chartLimit: 80,
    notes: "Plus unlocks every major pair with AI-powered predictions, enhanced macro scoring, and quicker refresh cadence for intraday optimization.",
    hasAccess: true,
  },
  elite: {
    label: "Elite Prediction Stream",
    allowedPairs: ALL_PAIRS,
    accuracyCap: 0.97,
    refreshMs: 60 * 60 * 1000, // 1 hour
    refreshLabel: "Refresh available every hour",
    chartLimit: 120,
    notes: "Elite access delivers near real-time AI predictions, extended history depth, and the highest confidence output we expose, including live macro overlays.",
    hasAccess: true,
  },
};

type Capability = (typeof PLAN_CAPABILITIES)[NormalizedPlan];

const SIGNAL_METADATA: Record<string, { label: string; description: string }> = {
  bullish_ob: { label: "Bullish Order Block", description: "Smart money buying footprint detected" },
  bearish_fvg: { label: "Bearish FVG", description: "Gap likely to attract sellers" },
  bos_bull: { label: "Bullish BOS", description: "Break of structure to the upside" },
  choch_bear: { label: "Bearish CHoCH", description: "Change of character favouring shorts" },
  liq_grab: { label: "Liquidity Grab", description: "Stop run / sweep identified" },
};

function normalisePlan(plan: string | undefined | null): NormalizedPlan {
  const value = (plan || "starter").toLowerCase();
  if (value === "starter") return "pro";
  if (value === "plus" || value === "elite") return value as "plus" | "elite";
  if (value === "pro") return "pro";
  return "pro";
}

function timeframeLabel(interval: string, horizon: number): string {
  if (interval === "1h") {
    return `next ${horizon} hour${horizon === 1 ? "" : "s"}`;
  }
  if (interval === "1d") {
    return `next ${24 * horizon} hours`;
  }
  if (interval === "1w") {
    return `next ${horizon} week${horizon === 1 ? "" : "s"}`;
  }
  return "upcoming session";
}

function formatCooldown(ms: number): string {
  if (ms <= 0) return "Ready";
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function buildFallbackForecast(pair: string, capability: Capability, plan: NormalizedPlan): ForecastResponse {
  const now = new Date();
  const seed = pair.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) + now.getUTCDate();
  const rhythm = Math.sin((now.getUTCHours() + seed) * 0.7);
  const directionIsBull = rhythm >= 0;
  const conviction = clamp(0.58 + Math.abs(rhythm) * 0.25, 0.5, capability.accuracyCap);
  const horizon = plan === "elite" ? 6 : plan === "plus" ? 5 : plan === "pro" ? 4 : 3;
  const interval = horizon >= 5 ? "4h" : "1h";
  const historyLength = Math.min(capability.chartLimit, 96);
  const priceBase = 1 + (seed % 50) * 0.0004;
  const history = Array.from({ length: historyLength }, (_, idx) => {
    const step = historyLength - idx;
    const drift = (directionIsBull ? 1 : -1) * 0.00045 * step;
    const noise = Math.sin((now.getTime() / 600000) + idx) * 0.0002;
    const close = Number((priceBase + drift + noise).toFixed(5));
    const time = new Date(now.getTime() - (historyLength - idx) * 60 * 60 * 1000).toISOString();
    return { time, close };
  });

  const signals: Record<string, number> = {
    bullish_ob: directionIsBull ? 1 : 0,
    bearish_fvg: directionIsBull ? 0 : 1,
    bos_bull: directionIsBull ? 1 : 0,
    choch_bear: directionIsBull ? 0.2 : 1,
    liq_grab: Math.abs(rhythm) > 0.45 ? 1 : 0,
  };

  return {
    pair,
    direction: directionIsBull ? "Bullish" : "Bearish",
    bull_prob: directionIsBull ? conviction : 1 - conviction,
    confidence: conviction,
    signals,
    horizon,
    interval,
    history,
    generated_at: now.toISOString(),
    disclaimer: "Preview synthesis uses delayed macro inputs and historical smart money patterns. Upgrade for live model outputs.",
  };
}

function buildDriverBullets(
  forecast: ForecastResponse | null,
  directionIsBull: boolean,
  adjustedDirectionalProb: number,
  capability: Capability,
  isPreview: boolean
): string[] {
  if (!forecast) return [];

  const bullets: string[] = [];
  const directionWord = directionIsBull ? "upside" : "downside";
  const timeframe = timeframeLabel(forecast.interval, forecast.horizon);
  bullets.push(`${Math.round(adjustedDirectionalProb * 100)}% probability that ${forecast.pair} extends to the ${directionWord} over the ${timeframe}.`);

  const sig = forecast.signals || {};
  if (directionIsBull && sig.bullish_ob) {
    bullets.push("Bullish order block alignment signals accumulation by smart money beneath current price.");
  }
  if (!directionIsBull && sig.bearish_fvg) {
    bullets.push("Bearish fair value gap overhead keeps imbalance favouring sell-side continuations.");
  }
  if (sig.liq_grab) {
    bullets.push("Liquidity sweep detected — expect follow-through as swept stops fuel the next leg.");
  }
  if (directionIsBull && sig.bos_bull) {
    bullets.push("Break of structure confirms bullish market state; monitor pullbacks for continuation entries.");
  }
  if (!directionIsBull && sig.choch_bear) {
    bullets.push("Change of character to the downside warns of distribution — be cautious fading momentum.");
  }

  if (bullets.length === 1) {
    bullets.push("Model maintains blended bias despite muted SMC confluence — watch order flow for confirmation triggers.");
  }

  if (isPreview) {
    bullets.push("Preview stream blends historical SMC patterns with delayed macro drivers. Upgrade for live fundamental heat-map, volume delta, and uncapped conviction.");
  }

  if (bullets.length > 4) {
    const core = bullets.slice(0, 3);
    const tail = bullets[bullets.length - 1];
    return [...core, tail];
  }

  return bullets;
}

export default function TradiaPredictPanel() {
  const { plan: rawPlan } = useUser();
  const { data: session } = useSession();
  const router = useRouter();
  const plan = normalisePlan(rawPlan);
  const capability = PLAN_CAPABILITIES[plan];
  const hasAccess = capability.hasAccess === true;
  const isPreview = !hasAccess;

  const [selectedPair, setSelectedPair] = useState<string>(capability.allowedPairs[0] || "EURUSD");
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [now, setNow] = useState(() => Date.now());

  const allowedPairsKey = useMemo(() => capability.allowedPairs.join("|"), [capability]);

  useEffect(() => {
    setSelectedPair((prev) => (capability.allowedPairs.includes(prev) ? prev : capability.allowedPairs[0]));
  }, [capability, allowedPairsKey]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const canRefresh = useMemo(() => {
    if (!lastUpdatedAt) return true;
    return Date.now() - lastUpdatedAt >= capability.refreshMs;
  }, [lastUpdatedAt, capability.refreshMs]);

  const cooldownRemaining = useMemo(() => {
    if (!lastUpdatedAt) return 0;
    return Math.max(0, capability.refreshMs - (now - lastUpdatedAt));
  }, [lastUpdatedAt, capability.refreshMs, now]);

  const fetchForecast = async (pair: string, { force = false } = {}) => {
    if (!hasAccess) return;
    
    if (!force && !canRefresh && forecast) {
      return;
    }
    setLoading(true);
    setIsRefreshing(true);
    setError(null);
    try {
      const sessionUserId =
        typeof session?.user === "object" && session.user !== null
          ? (session.user as { id?: string }).id ?? undefined
          : undefined;

      const params = new URLSearchParams({ pair });
      if (sessionUserId) {
        params.set("user_id", sessionUserId);
      }

      const res = await fetch(`/api/predict?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.message || "Unable to fetch prediction right now");
      }
      const data: ForecastResponse = await res.json();
      setForecast(data);
      setLastUpdatedAt(Date.now());
    } catch (err: any) {
      const message = err?.message || "Prediction request failed";
      setError(message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      fetchForecast(selectedPair, { force: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPair, plan, hasAccess]);

  const directionIsBull = forecast?.direction === "Bullish";
  const displayConfidence = forecast
    ? clamp(forecast.confidence, 0, capability.accuracyCap)
    : clamp(isPreview ? 0.55 : 0, 0, capability.accuracyCap);
  const directionalConviction = forecast
    ? clamp(directionIsBull ? forecast.bull_prob : 1 - forecast.bull_prob, 0, 1)
    : clamp(isPreview ? 0.58 : 0, 0, 1);
  const adjustedDirectionalProb = clamp(directionalConviction, 0, capability.accuracyCap);

  const chartData = useMemo(() => {
    if (!forecast?.history?.length) return [];
    const entries = forecast.history.slice(-capability.chartLimit);
    return entries.map((entry) => {
      const pointDate = new Date(entry.time);
      const label = capability.chartLimit > 72 ? format(pointDate, "MMM d") : format(pointDate, "HH:mm");
      const close = typeof entry.close === "number" ? entry.close : Number(entry.close);
      return {
        time: label,
        rawTime: pointDate,
        close,
      };
    });
  }, [forecast?.history, capability.chartLimit]);

  const overviewSummary = useMemo(() => {
    if (!forecast) return "";
    const phrase = timeframeLabel(forecast.interval, forecast.horizon);
    return `${forecast.pair} possible next direction is ${forecast.direction.toLowerCase()} in the ${phrase}.`;
  }, [forecast]);

  const signalEntries = useMemo(() => {
    if (!forecast?.signals) return [];
    return Object.entries(SIGNAL_METADATA).map(([key, meta]) => ({
      key,
      active: Boolean(forecast.signals?.[key]),
      ...meta,
    }));
  }, [forecast?.signals]);

  const driverBullets = useMemo(
    () => buildDriverBullets(forecast, Boolean(directionIsBull), adjustedDirectionalProb, capability, isPreview),
    [forecast, directionIsBull, adjustedDirectionalProb, capability, isPreview]
  );

  const lastUpdatedLabel = forecast?.generated_at
    ? `${formatDistanceToNow(new Date(forecast.generated_at), { addSuffix: true })}`
    : lastUpdatedAt
      ? `${formatDistanceToNow(new Date(lastUpdatedAt), { addSuffix: true })}`
      : "Fetching forecast...";

  const accuracyPercent = Math.round(displayConfidence * 100);
  const directionalPercent = Math.round(adjustedDirectionalProb * 100);
  const refreshDisabled = loading || (!canRefresh && forecast !== null && !isPreview);
  const refreshLabel = canRefresh || !forecast ? "Refresh forecast" : `Refresh in ${formatCooldown(cooldownRemaining)}`;

  // Show upgrade prompt if no access
  if (!hasAccess) {
    return (
      <div className="space-y-6">
        <Card className="border-blue-500/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-blue-500" />
              <CardTitle>Tradia Predict</CardTitle>
              <Badge variant="outline" className="ml-auto">
                Plus & Elite Only
              </Badge>
            </div>
            <CardDescription>
              AI-powered market predictions to forecast the next possible direction for major currency pairs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 p-6 text-center">
              <Brain className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Upgrade to Access Tradia Predict</h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Tradia Predict uses Mistral AI to analyze market data, liquidity patterns, and macro trends to forecast the next probable market direction. Available exclusively for Plus and Elite members.
              </p>
              <div className="grid gap-4 md:grid-cols-2 max-w-3xl mx-auto mb-6">
                <div className="text-left p-4 rounded-lg bg-background/50 border border-border">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Plus Plan Features
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• All 5 major currency pairs</li>
                    <li>• 3-hour refresh cadence</li>
                    <li>• 90% confidence cap</li>
                    <li>• Enhanced macro scoring</li>
                  </ul>
                </div>
                <div className="text-left p-4 rounded-lg bg-background/50 border border-border">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Elite Plan Features
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• All Plus features</li>
                    <li>• 1-hour refresh cadence</li>
                    <li>• 97% confidence cap</li>
                    <li>• Real-time macro overlays</li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-3 justify-center">
                <Button
                  size="lg"
                  onClick={() => router.push("/checkout?plan=plus")}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Upgrade to Plus
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => router.push("/checkout?plan=elite")}
                >
                  Upgrade to Elite
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-500" />
            <CardTitle>Tradia Predict</CardTitle>
            <Badge variant="outline" className="ml-auto flex items-center gap-1">
              <Brain className="w-3 h-3" />
              {capability.label}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1 bg-purple-500/10 border-purple-500/30">
              <Zap className="w-3 h-3" />
              Powered by Mistral
            </Badge>
          </div>
          <CardDescription>
              AI-powered market predictions to analyze liquidity, momentum, and macro trends. Confidence and refresh cadence adapt to your plan tier.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              {capability.allowedPairs.map((pair) => {
                const selected = selectedPair === pair;
                return (
                  <Button
                    key={pair}
                    variant={selected ? "default" : "outline"}
                    size="sm"
                    disabled={selected && capability.allowedPairs.length === 1}
                    onClick={() => setSelectedPair(pair)}
                  >
                    {pair}
                  </Button>
                );
              })}
            </div>
            <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="w-4 h-4" />
              {capability.refreshLabel}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Brain className="w-4 h-4" />
              Confidence capped at {Math.round(capability.accuracyCap * 100)}%
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchForecast(selectedPair, { force: true })}
              disabled={refreshDisabled}
              className="flex items-center gap-1"
            >
              {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {refreshLabel}
            </Button>
          </div>


          {error && (
            <div className="flex items-center gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {loading && !forecast ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Fetching latest prediction…
            </div>
          ) : forecast ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                  <CardContent className="pt-6">
                    <div className="text-xs uppercase tracking-wide text-blue-400 mb-2">Summary</div>
                    <div className="flex items-center gap-2 mb-3">
                      {directionIsBull ? <ArrowUpRight className="w-5 h-5 text-green-500" /> : <ArrowDownRight className="w-5 h-5 text-red-500" />}
                      <span className="text-lg font-semibold">{overviewSummary}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Generated {lastUpdatedLabel}. {capability.notes}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-blue-500/20">
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Forecast confidence</span>
                      <Badge variant="outline">{accuracyPercent}%</Badge>
                    </div>
                    <Progress className="h-2" value={accuracyPercent} />
                    <div className="text-xs text-muted-foreground">
                      Confidence is plan-aware. Upgrade to elevate accuracy caps and refresh cadence.
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-blue-500/20">
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>{directionIsBull ? "Bullish probability" : "Bearish probability"}</span>
                      <Badge className={directionIsBull ? "bg-green-500 text-white hover:bg-green-500" : "bg-red-500 text-white hover:bg-red-500"}>
                        {directionalPercent}%
                      </Badge>
                    </div>
                    <Progress
                      className={`h-2 ${directionIsBull ? "bg-green-500/20" : "bg-red-500/20"}`}
                      value={directionalPercent}
                    />
                    <div className="text-xs text-muted-foreground">
                      Directional conviction blends structure, volatility regime, and macro flows tuned to your plan tier.
                    </div>
                  </CardContent>
                </Card>
              </div>

              {driverBullets.length > 0 && (
                <Card className="border border-blue-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Brain className="w-4 h-4 text-blue-400" />
                      High-probability confluence
                    </CardTitle>
                    <CardDescription>
                      SMC, liquidity, and macro context blended to outline the next likely leg.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {driverBullets.map((item, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500/80" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <Card className="border border-blue-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    SMC Signal Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-5">
                    {signalEntries.map(({ key, label, description, active }) => (
                      <div
                        key={key}
                        className={`rounded-lg border p-3 text-xs ${active ? "border-green-500/40 bg-green-500/10" : "border-gray-700 bg-gray-900/40"}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm">{label}</span>
                          <Badge
                            variant={active ? "default" : "outline"}
                            className={active ? "bg-green-500 hover:bg-green-500" : "text-muted-foreground"}
                          >
                            {active ? "On" : "Off"}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-blue-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Recent price action</CardTitle>
                  <CardDescription>
                    {chartData.length ? `Latest ${chartData.length} bars plotted. Forecast horizon: ${timeframeLabel(forecast.interval, forecast.horizon)}.` : "Waiting for historical prices…"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[320px]">
                  {chartData.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={directionIsBull ? "#22c55e" : "#ef4444"} stopOpacity={0.35} />
                            <stop offset="95%" stopColor={directionIsBull ? "#22c55e" : "#ef4444"} stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.25} />
                        <XAxis dataKey="time" minTickGap={24} tick={{ fontSize: 12, fill: "#9ca3af" }} />
                        <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} domain={["auto", "auto"]} width={70} />
                        <Tooltip
                          contentStyle={{ background: "#111827", border: "1px solid rgba(59,130,246,0.3)", borderRadius: "0.75rem" }}
                          labelStyle={{ color: "#e5e7eb" }}
                          formatter={(value: number) => [value.toFixed(5), "Close"]}
                        />
                        <Area type="monotone" dataKey="close" stroke={directionIsBull ? "#22c55e" : "#ef4444"} fillOpacity={1} fill="url(#forecastGradient)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      Waiting for market data…
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-blue-100">
                <div className="flex flex-wrap items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Work rate:</span>
                  <span className="font-medium">{capability.refreshLabel}</span>
                  <Separator orientation="vertical" className="h-4" />
                  <span>Confidence window:</span>
                  <span className="font-medium">capped at {Math.round(capability.accuracyCap * 100)}%</span>
                  {!canRefresh && forecast && (
                    <>
                      <Separator orientation="vertical" className="h-4" />
                      <span>Next refresh in {formatCooldown(cooldownRemaining)}</span>
                    </>
                  )}
                </div>
                {forecast?.disclaimer && (
                  <p className="mt-2 text-xs text-blue-200/80">{forecast.disclaimer}</p>
                )}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

