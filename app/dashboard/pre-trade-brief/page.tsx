"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import LayoutClient from "@/components/LayoutClient";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import type {
  ChecklistStateMap,
  EditablePreTradeBriefStatus,
  PreTradeBriefListItem,
  PreTradeBriefRecord,
} from "@/types/preTradeBrief";
import type { MarketBiasRecord } from "@/types/marketBias";
import type { EconomicEvent, EventRiskAction } from "@/types/eventAwareness";
import type { PreTradeQualityMetrics } from "@/types/preTradeMetrics";

type PairOption = {
  id: string;
  symbol: string;
  base_currency: string;
  quote_currency: string;
  category: string;
};

type BriefCreateResult = {
  id: string;
  pair_symbol_snapshot: string;
  timeframe: string;
  market_session: string;
  directional_bias_input: string;
  risk_reward_ratio: number | null;
  ai_summary: string;
  ai_bias: string;
  ai_confluence: string[];
  ai_risks: string[];
  ai_invalidators: string[];
  ai_checklist: string[];
  ai_model?: string | null;
  prompt_version?: string | null;
  generation_latency_ms?: number | null;
  event_risk_action?: EventRiskAction | null;
  event_risk_summary?: string | null;
  event_risk_window_start?: string | null;
  event_risk_window_end?: string | null;
  approval_state?: "ready" | "blocked" | "manual_override" | null;
  created_at: string;
};

type EventRiskResult = {
  pairSymbol: string;
  plannedAt: string;
  action: EventRiskAction;
  summary: string;
  windowStart: string | null;
  windowEnd: string | null;
  events: EconomicEvent[];
};

const TIMEFRAMES = ["M5", "M15", "M30", "H1", "H4", "D1"];
const SESSIONS = ["ASIA", "LONDON", "NEW_YORK", "OVERLAP"];
const BIASES = ["bullish", "bearish", "neutral"];
const EDITABLE_STATUSES: EditablePreTradeBriefStatus[] = ["draft", "ready", "invalidated", "executed", "skipped"];
const BRIEF_STATUS_FILTERS = ["all", "ready", "invalidated", "executed"] as const;
type BriefStatusFilter = (typeof BRIEF_STATUS_FILTERS)[number];
const BIAS_TIMEFRAMES = ["M15", "M30", "H1", "H4", "D1"] as const;

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const toSafeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
};

function PreTradeBriefContent() {
  const { status } = useSession();
  const router = useRouter();

  const [pairs, setPairs] = useState<PairOption[]>([]);
  const [recentBriefs, setRecentBriefs] = useState<PreTradeBriefListItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [result, setResult] = useState<BriefCreateResult | null>(null);

  const [selectedBriefId, setSelectedBriefId] = useState<string | null>(null);
  const [selectedBrief, setSelectedBrief] = useState<PreTradeBriefRecord | null>(null);
  const detailCacheRef = useRef<Record<string, PreTradeBriefRecord>>({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [traderNotesDraft, setTraderNotesDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<EditablePreTradeBriefStatus>("draft");
  const [checklistStateDraft, setChecklistStateDraft] = useState<ChecklistStateMap>({});
  const [savingDetail, setSavingDetail] = useState(false);

  const [pairSymbol, setPairSymbol] = useState("EURUSD");
  const [timeframe, setTimeframe] = useState("H1");
  const [marketSession, setMarketSession] = useState("LONDON");
  const [directionalBiasInput, setDirectionalBiasInput] = useState("bullish");
  const [setupNotes, setSetupNotes] = useState("");
  const [plannedEntry, setPlannedEntry] = useState("");
  const [plannedStopLoss, setPlannedStopLoss] = useState("");
  const [plannedTakeProfit, setPlannedTakeProfit] = useState("");
  const [plannedExecutionAt, setPlannedExecutionAt] = useState("");
  const [briefStatusFilter, setBriefStatusFilter] = useState<BriefStatusFilter>("all");

  const [biasTimeframes, setBiasTimeframes] = useState<string[]>(["H4", "H1", "M15"]);
  const [biasSessionContext, setBiasSessionContext] = useState("");
  const [biasBackdrop, setBiasBackdrop] = useState("");
  const [generatingBias, setGeneratingBias] = useState(false);
  const [biasError, setBiasError] = useState<string | null>(null);
  const [latestBias, setLatestBias] = useState<MarketBiasRecord | null>(null);

  const [eventRisk, setEventRisk] = useState<EventRiskResult | null>(null);
  const [eventRiskLoading, setEventRiskLoading] = useState(false);
  const [eventRiskError, setEventRiskError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<PreTradeQualityMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return Boolean(pairSymbol && timeframe && marketSession && directionalBiasInput);
  }, [pairSymbol, timeframe, marketSession, directionalBiasInput]);

  const isEventAcknowledged = Boolean(checklistStateDraft["Event risk acknowledged"]?.completed);

  const loadMetrics = async () => {
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const response = await fetch("/api/pre-trade-brief/metrics?days=30");
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Failed to load quality metrics");
      }
      const payload = (await response.json()) as PreTradeQualityMetrics;
      setMetrics(payload);
    } catch (err) {
      setMetricsError(err instanceof Error ? err.message : "Failed to load quality metrics");
      setMetrics(null);
    } finally {
      setMetricsLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setGlobalError(null);

    try {
      const response = await fetch(`/api/pre-trade-brief?status=${briefStatusFilter}`, { method: "GET" });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Failed to load pre-trade brief data");
      }

      const payload = await response.json();
      const nextPairs: PairOption[] = payload.pairs || [];
      const nextBriefs: PreTradeBriefListItem[] = payload.briefs || [];

      setPairs(nextPairs);
      setRecentBriefs(nextBriefs);

      if (nextPairs.length && !nextPairs.find((pair) => pair.symbol === pairSymbol)) {
        setPairSymbol(nextPairs[0].symbol);
      }

      if (selectedBriefId && !nextBriefs.some((brief) => brief.id === selectedBriefId)) {
        setSelectedBriefId(nextBriefs[0]?.id ?? null);
        if (!nextBriefs.length) {
          setSelectedBrief(null);
        }
      } else if (!selectedBriefId && nextBriefs.length) {
        setSelectedBriefId(nextBriefs[0].id);
      }
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Failed to load pre-trade brief data");
    } finally {
      setLoading(false);
    }
  };

  const loadBriefDetail = async (briefId: string) => {
    const cachedDetail = detailCacheRef.current[briefId];
    if (cachedDetail) {
      setSelectedBrief(cachedDetail);
      setTraderNotesDraft(cachedDetail.trader_notes || "");
      setStatusDraft(
        cachedDetail.status === "generated" || cachedDetail.status === "failed" ? "draft" : cachedDetail.status
      );
      setChecklistStateDraft(cachedDetail.checklist_state || {});
      return;
    }

    setDetailLoading(true);
    setDetailError(null);

    try {
      const response = await fetch(`/api/pre-trade-brief/${briefId}`);
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Failed to load brief detail");
      }

      const detail: PreTradeBriefRecord = await response.json();
      detailCacheRef.current[briefId] = detail;
      setSelectedBrief(detail);
      setTraderNotesDraft(detail.trader_notes || "");
      setStatusDraft(
        detail.status === "generated" || detail.status === "failed" ? "draft" : detail.status
      );
      setChecklistStateDraft(detail.checklist_state || {});
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Failed to load brief detail");
      setSelectedBrief(null);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      void loadData();
      void loadMetrics();
    }
  }, [status, briefStatusFilter]);

  useEffect(() => {
    if (status === "authenticated" && selectedBriefId) {
      void loadBriefDetail(selectedBriefId);
    }
  }, [status, selectedBriefId]);

  useEffect(() => {
    if (status === "authenticated" && pairSymbol) {
      void loadLatestBias();
    }
  }, [status, pairSymbol]);

  useEffect(() => {
    if (status === "authenticated" && pairSymbol) {
      void loadEventRisk();
    }
  }, [status, pairSymbol, plannedExecutionAt]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen w-full bg-white dark:bg-[#0D1117] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGlobalError(null);
    setSubmitting(true);

    try {
      const body = {
        pairSymbol,
        timeframe,
        marketSession,
        directionalBiasInput,
        setupNotes,
        plannedEntry,
        plannedStopLoss,
        plannedTakeProfit,
        plannedExecutionAt,
      };

      const response = await fetch("/api/pre-trade-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Failed to generate pre-trade brief");
      }

      const payload: BriefCreateResult = await response.json();
      setResult(payload);
      if (payload.event_risk_action) {
        setEventRisk((prev) => ({
          pairSymbol,
          plannedAt: plannedExecutionAt || new Date().toISOString(),
          action: payload.event_risk_action as EventRiskAction,
          summary: payload.event_risk_summary || prev?.summary || "",
          windowStart: payload.event_risk_window_start || null,
          windowEnd: payload.event_risk_window_end || null,
          events: prev?.events || [],
        }));
      }
      await loadData();
      await loadMetrics();
      setSelectedBriefId(payload.id);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Failed to generate pre-trade brief");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleChecklistItem = (item: string, checked: boolean) => {
    setChecklistStateDraft((prev) => ({
      ...prev,
      [item]: {
        completed: checked,
        completedAt: checked ? new Date().toISOString() : undefined,
      },
    }));
  };

  const handleSaveDetail = async () => {
    if (!selectedBriefId) return;

    if (statusDraft === "ready" && eventRisk?.action === "wait" && !isEventAcknowledged) {
      setDetailError("Event risk is marked as WAIT. Acknowledge event risk in checklist before setting status to ready.");
      return;
    }

    setSavingDetail(true);
    setDetailError(null);

    try {
      const response = await fetch(`/api/pre-trade-brief/${selectedBriefId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: statusDraft,
          trader_notes: traderNotesDraft,
          checklist_state: checklistStateDraft,
          last_reviewed_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Failed to save brief detail");
      }

      const updated: PreTradeBriefRecord = await response.json();
      detailCacheRef.current[selectedBriefId] = updated;
      setSelectedBrief((prev) => ({ ...(prev || {}), ...updated } as PreTradeBriefRecord));

      setRecentBriefs((prev) =>
        prev
          .map((brief) =>
            brief.id === updated.id
              ? {
                  ...brief,
                  status: updated.status,
                }
              : brief
          )
          .filter((brief) => briefStatusFilter === "all" || brief.status === briefStatusFilter)
      );
      await loadMetrics();
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Failed to save brief detail");
    } finally {
      setSavingDetail(false);
    }
  };

  const loadEventRisk = async () => {
    setEventRiskError(null);
    setEventRiskLoading(true);
    try {
      const params = new URLSearchParams({ pairSymbol });
      if (plannedExecutionAt) {
        params.set("plannedAt", new Date(plannedExecutionAt).toISOString());
      }
      const response = await fetch(`/api/event-awareness?${params.toString()}`);
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Failed to load event risk");
      }
      const payload = (await response.json()) as EventRiskResult;
      setEventRisk(payload);
    } catch (err) {
      setEventRiskError(err instanceof Error ? err.message : "Failed to load event risk");
      setEventRisk(null);
    } finally {
      setEventRiskLoading(false);
    }
  };

  const toggleBiasTimeframe = (tf: string) => {
    setBiasTimeframes((prev) => {
      if (prev.includes(tf)) {
        const next = prev.filter((item) => item !== tf);
        return next.length ? next : prev;
      }
      return [...prev, tf];
    });
  };

  const loadLatestBias = async () => {
    setBiasError(null);
    try {
      const response = await fetch(`/api/market-bias?pairSymbol=${pairSymbol}`);
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Failed to load market bias");
      }
      const payload = await response.json();
      const reports = (payload.reports || []) as MarketBiasRecord[];
      setLatestBias(reports[0] || null);
    } catch (err) {
      setBiasError(err instanceof Error ? err.message : "Failed to load market bias");
      setLatestBias(null);
    }
  };

  const handleGenerateBias = async () => {
    setBiasError(null);
    setGeneratingBias(true);

    try {
      const response = await fetch("/api/market-bias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pairSymbol,
          timeframeSet: biasTimeframes,
          sessionContext: biasSessionContext,
          recentBackdrop: biasBackdrop,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Failed to generate market bias");
      }

      const created = (await response.json()) as MarketBiasRecord;
      setLatestBias(created);
    } catch (err) {
      setBiasError(err instanceof Error ? err.message : "Failed to generate market bias");
    } finally {
      setGeneratingBias(false);
    }
  };

  const renderList = (items: unknown) => {
    const safeItems = toSafeStringArray(items);
    if (!safeItems.length) {
      return <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">N/A</p>;
    }

    return (
    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
      {safeItems.map((item, idx) => (
        <li key={`${item}-${idx}`}>{item}</li>
      ))}
    </ul>
    );
  };

  return (
    <div className="min-h-screen w-full bg-white dark:bg-[#0D1117] transition-colors duration-300">
      <div className="flex h-screen">
        <div className="flex-1 flex flex-col overflow-hidden">
          <DashboardHeader
            title="Pre-Trade Brief"
            description="Generate, inspect, and update Forex planning briefs"
            showBackButton
          />

          <div className="flex-1 overflow-auto p-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Create Brief</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Decision-support only. AI output is advisory and never guaranteed.
                </p>

                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Forex Pair</label>
                    <select
                      value={pairSymbol}
                      onChange={(e) => setPairSymbol(e.target.value)}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0D1117] px-3 py-2 text-sm"
                    >
                      {pairs.map((pair) => (
                        <option key={pair.id} value={pair.symbol}>
                          {pair.symbol} ({pair.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Timeframe</label>
                      <select
                        value={timeframe}
                        onChange={(e) => setTimeframe(e.target.value)}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0D1117] px-3 py-2 text-sm"
                      >
                        {TIMEFRAMES.map((value) => (
                          <option key={value} value={value}>{value}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Market Session</label>
                      <select
                        value={marketSession}
                        onChange={(e) => setMarketSession(e.target.value)}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0D1117] px-3 py-2 text-sm"
                      >
                        {SESSIONS.map((value) => (
                          <option key={value} value={value}>{value}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Directional Bias</label>
                    <select
                      value={directionalBiasInput}
                      onChange={(e) => setDirectionalBiasInput(e.target.value)}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0D1117] px-3 py-2 text-sm"
                    >
                      {BIASES.map((value) => (
                        <option key={value} value={value} className="capitalize">{value}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Setup Notes (optional)</label>
                    <textarea
                      value={setupNotes}
                      onChange={(e) => setSetupNotes(e.target.value)}
                      rows={4}
                      placeholder="Context, structure, and execution notes..."
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0D1117] px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Entry (optional)</label>
                      <input
                        type="number"
                        step="any"
                        value={plannedEntry}
                        onChange={(e) => setPlannedEntry(e.target.value)}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0D1117] px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Stop Loss (optional)</label>
                      <input
                        type="number"
                        step="any"
                        value={plannedStopLoss}
                        onChange={(e) => setPlannedStopLoss(e.target.value)}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0D1117] px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Take Profit (optional)</label>
                      <input
                        type="number"
                        step="any"
                        value={plannedTakeProfit}
                        onChange={(e) => setPlannedTakeProfit(e.target.value)}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0D1117] px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  {globalError && (
                    <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
                      {globalError}
                    </div>
                  )}

                  <Button type="submit" disabled={!canSubmit || submitting} className="w-full">
                    {submitting ? "Generating Brief..." : "Generate Pre-Trade Brief"}
                  </Button>
                </form>
              </section>

              <section className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Latest Generated Brief</h2>
                {!result ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Submit the form to generate your first brief.</p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Summary</h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{result.ai_summary}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Bias</h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{result.ai_bias}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Confluence</h3>
                      {renderList(result.ai_confluence || [])}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Risks</h3>
                      {renderList(result.ai_risks || [])}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Invalidation</h3>
                      {renderList(result.ai_invalidators || [])}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Checklist</h3>
                      {renderList(result.ai_checklist || [])}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Pair: {result.pair_symbol_snapshot} | Timeframe: {result.timeframe} | Session: {result.market_session}
                      {result.risk_reward_ratio != null ? ` | R:R ${result.risk_reward_ratio}` : ""}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Event action: {result.event_risk_action || "N/A"} | Model: {result.ai_model || "N/A"} | Prompt: {result.prompt_version || "N/A"}
                      {result.generation_latency_ms != null ? ` | ${result.generation_latency_ms}ms` : ""}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Approval state: {result.approval_state || "N/A"}
                    </div>
                  </div>
                )}
              </section>
            </div>

            <div className="mt-6">
              <section className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Quality Metrics (30 Days)</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Adoption, checklist discipline, and execution drift for recent pre-trade workflow activity.
                  </p>
                </div>

                {metricsLoading ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading quality metrics...</p>
                ) : metricsError ? (
                  <p className="text-sm text-red-600 dark:text-red-300">{metricsError}</p>
                ) : !metrics ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No metrics available yet.</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Adoption Rate</p>
                      <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{metrics.adoption_rate}%</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {metrics.reviewed_briefs}/{metrics.generated_briefs} briefs reviewed
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Checklist Completion</p>
                      <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                        {metrics.checklist_completion_rate}%
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        coverage: {metrics.checklist_coverage} briefs
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Execution Drift</p>
                      <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                        {metrics.execution_drift_rate}%
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        measured on {metrics.executed_briefs} executed briefs
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Active Days</p>
                      <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{metrics.active_days}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        in last {metrics.period_days} days
                      </p>
                    </div>
                  </div>
                )}
              </section>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <section className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Market Bias Snapshot</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Generate directional context before execution. This is decision-support only.
                </p>

                <div className="space-y-4">
                  <div>
                    <p className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Timeframes</p>
                    <div className="flex flex-wrap gap-2">
                      {BIAS_TIMEFRAMES.map((tf) => {
                        const active = biasTimeframes.includes(tf);
                        return (
                          <button
                            key={tf}
                            type="button"
                            onClick={() => toggleBiasTimeframe(tf)}
                            className={`rounded-md border px-3 py-1 text-sm ${
                              active
                                ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                                : "border-gray-300 bg-white text-gray-700 dark:border-gray-700 dark:bg-[#0D1117] dark:text-gray-300"
                            }`}
                          >
                            {tf}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Planned Execution Time (optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={plannedExecutionAt}
                      onChange={(e) => setPlannedExecutionAt(e.target.value)}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0D1117] px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Session Context (optional)
                    </label>
                    <input
                      value={biasSessionContext}
                      onChange={(e) => setBiasSessionContext(e.target.value)}
                      placeholder="Example: London open, moderate volatility"
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0D1117] px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Recent Backdrop (optional)
                    </label>
                    <textarea
                      rows={3}
                      value={biasBackdrop}
                      onChange={(e) => setBiasBackdrop(e.target.value)}
                      placeholder="Key events, recent structure, or volatility notes..."
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0D1117] px-3 py-2 text-sm"
                    />
                  </div>

                  {biasError && (
                    <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
                      {biasError}
                    </div>
                  )}

                  <Button type="button" onClick={handleGenerateBias} disabled={generatingBias || !pairSymbol}>
                    {generatingBias ? "Generating Bias..." : `Generate Bias for ${pairSymbol}`}
                  </Button>
                </div>
              </section>

              <section className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Latest Bias Result</h2>
                {!latestBias ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No saved bias report for {pairSymbol}. Generate a snapshot to begin.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Direction:</span> {latestBias.bias_direction} |{" "}
                      <span className="font-medium">Confidence:</span> {latestBias.confidence_score}
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Timeframes:</span>{" "}
                      {toSafeStringArray(latestBias.timeframe_set).join(", ") || "N/A"}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Assumptions</h3>
                      {renderList(latestBias.assumptions)}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Invalidation Conditions</h3>
                      {renderList(latestBias.invalidation_conditions)}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Alternate Scenario</h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{latestBias.alternate_scenario || "N/A"}</p>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Generated: {formatDate(latestBias.created_at)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Model: {latestBias.ai_model || "N/A"} | Prompt: {latestBias.prompt_version || "N/A"}
                      {latestBias.generation_latency_ms != null ? ` | ${latestBias.generation_latency_ms}ms` : ""}
                    </div>
                  </div>
                )}
              </section>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-1">
              <section className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Event Awareness</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Execution-window event risk guidance for {pairSymbol}.
                </p>
                {eventRiskLoading ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading event risk...</p>
                ) : eventRiskError ? (
                  <p className="text-sm text-red-600 dark:text-red-300">{eventRiskError}</p>
                ) : !eventRisk ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No event risk report available yet.</p>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Action:</span> {eventRisk.action}
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">{eventRisk.summary}</p>
                    {eventRisk.windowStart && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Risk window: {formatDate(eventRisk.windowStart)} - {eventRisk.windowEnd ? formatDate(eventRisk.windowEnd) : "N/A"}
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Relevant Events</h3>
                      {!Array.isArray(eventRisk.events) || !eventRisk.events.length ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">No mapped events in window.</p>
                      ) : (
                        <ul className="mt-1 space-y-2">
                          {eventRisk.events.map((event) => (
                            <li key={event.id} className="text-sm text-gray-700 dark:text-gray-300">
                              {event.currency} | {event.impact} | {formatDate(event.scheduled_at)} | {event.title}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-5">
              <section className="lg:col-span-2 bg-white dark:bg-[#161B22] border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                <div className="mb-4 flex items-end justify-between gap-3">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Saved Briefs</h2>
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Status
                    </label>
                    <select
                      value={briefStatusFilter}
                      onChange={(e) => setBriefStatusFilter(e.target.value as BriefStatusFilter)}
                      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-[#0D1117]"
                    >
                      {BRIEF_STATUS_FILTERS.map((filterValue) => (
                        <option key={filterValue} value={filterValue}>
                          {filterValue}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {!recentBriefs.length ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No briefs saved yet.</p>
                ) : (
                  <div className="space-y-2">
                    {recentBriefs.map((brief) => {
                      const selected = brief.id === selectedBriefId;
                      return (
                        <button
                          key={brief.id}
                          onClick={() => setSelectedBriefId(brief.id)}
                          className={`w-full text-left border rounded-lg p-3 transition-colors ${
                            selected
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                              : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#0f141b]"
                          }`}
                        >
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {brief.pair_symbol_snapshot} | {brief.timeframe}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                            {brief.market_session} | {brief.directional_bias_input} | {brief.status}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatDate(brief.created_at)}</div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="lg:col-span-3 bg-white dark:bg-[#161B22] border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Brief Detail & Workflow</h2>

                {detailLoading ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading detail...</p>
                ) : detailError ? (
                  <p className="text-sm text-red-600 dark:text-red-300">{detailError}</p>
                ) : !selectedBrief ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Select a saved brief to inspect and update it.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div><span className="font-medium">Pair:</span> {selectedBrief.pair_symbol_snapshot}</div>
                      <div><span className="font-medium">Timeframe:</span> {selectedBrief.timeframe}</div>
                      <div><span className="font-medium">Session:</span> {selectedBrief.market_session}</div>
                      <div><span className="font-medium">Directional idea:</span> {selectedBrief.directional_bias_input}</div>
                      <div><span className="font-medium">Entry:</span> {selectedBrief.planned_entry ?? "N/A"}</div>
                      <div><span className="font-medium">Stop Loss:</span> {selectedBrief.planned_stop_loss ?? "N/A"}</div>
                      <div><span className="font-medium">Take Profit:</span> {selectedBrief.planned_take_profit ?? "N/A"}</div>
                      <div><span className="font-medium">R:R:</span> {selectedBrief.risk_reward_ratio ?? "N/A"}</div>
                      <div><span className="font-medium">Approval:</span> {selectedBrief.approval_state ?? "N/A"}</div>
                      <div><span className="font-medium">Created:</span> {formatDate(selectedBrief.created_at)}</div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Current Status</label>
                      <select
                        value={statusDraft}
                        onChange={(e) => setStatusDraft(e.target.value as EditablePreTradeBriefStatus)}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0D1117] px-3 py-2 text-sm"
                      >
                        {EDITABLE_STATUSES.map((statusOption) => (
                          <option value={statusOption} key={statusOption}>
                            {statusOption}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Setup Notes</h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{selectedBrief.setup_notes || "N/A"}</p>
                    </div>

                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Summary</h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{selectedBrief.ai_summary || "N/A"}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Bias</h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{selectedBrief.ai_bias || "N/A"}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Confluence</h3>
                      {renderList(selectedBrief.ai_confluence)}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Risks</h3>
                      {renderList(selectedBrief.ai_risks)}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Invalidation</h3>
                      {renderList(selectedBrief.ai_invalidators)}
                    </div>

                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Event Risk</h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                        {selectedBrief.event_risk_action || "N/A"} | {selectedBrief.event_risk_summary || "No event summary available."}
                      </p>
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Model: {selectedBrief.ai_model || "N/A"} | Prompt: {selectedBrief.prompt_version || "N/A"}
                      {selectedBrief.generation_latency_ms != null ? ` | ${selectedBrief.generation_latency_ms}ms` : ""}
                    </div>

                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">Checklist Progress</h3>
                      <div className="space-y-2">
                        {toSafeStringArray(selectedBrief.ai_checklist).map((item, idx) => {
                          const checked = checklistStateDraft[item]?.completed || false;
                          return (
                            <label key={`${item}-${idx}`} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => toggleChecklistItem(item, e.target.checked)}
                                className="mt-1"
                              />
                              <span>{item}</span>
                            </label>
                          );
                        })}
                        <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={isEventAcknowledged}
                            onChange={(e) => toggleChecklistItem("Event risk acknowledged", e.target.checked)}
                            className="mt-1"
                          />
                          <span>Event risk acknowledged</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Trader Notes</label>
                      <textarea
                        rows={4}
                        value={traderNotesDraft}
                        onChange={(e) => setTraderNotesDraft(e.target.value)}
                        placeholder="Add your own execution notes and reminders..."
                        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0D1117] px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Decision-support only. This brief does not guarantee outcomes.
                    </div>

                    <Button onClick={handleSaveDetail} disabled={savingDetail}>
                      {savingDetail ? "Saving..." : "Save Notes, Checklist & Status"}
                    </Button>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PreTradeBriefPage() {
  return (
    <LayoutClient>
      <PreTradeBriefContent />
    </LayoutClient>
  );
}

