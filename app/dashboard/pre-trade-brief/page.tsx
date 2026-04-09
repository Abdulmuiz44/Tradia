"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  created_at: string;
};

const TIMEFRAMES = ["M5", "M15", "M30", "H1", "H4", "D1"];
const SESSIONS = ["ASIA", "LONDON", "NEW_YORK", "OVERLAP"];
const BIASES = ["bullish", "bearish", "neutral"];
const EDITABLE_STATUSES: EditablePreTradeBriefStatus[] = ["draft", "ready", "invalidated", "executed", "skipped"];

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
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

  const canSubmit = useMemo(() => {
    return Boolean(pairSymbol && timeframe && marketSession && directionalBiasInput);
  }, [pairSymbol, timeframe, marketSession, directionalBiasInput]);

  const loadData = async () => {
    setLoading(true);
    setGlobalError(null);

    try {
      const response = await fetch("/api/pre-trade-brief", { method: "GET" });
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

      if (!selectedBriefId && nextBriefs.length) {
        setSelectedBriefId(nextBriefs[0].id);
      }
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Failed to load pre-trade brief data");
    } finally {
      setLoading(false);
    }
  };

  const loadBriefDetail = async (briefId: string) => {
    setDetailLoading(true);
    setDetailError(null);

    try {
      const response = await fetch(`/api/pre-trade-brief/${briefId}`);
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Failed to load brief detail");
      }

      const detail: PreTradeBriefRecord = await response.json();
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
    }
  }, [status]);

  useEffect(() => {
    if (status === "authenticated" && selectedBriefId) {
      void loadBriefDetail(selectedBriefId);
    }
  }, [status, selectedBriefId]);

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
      await loadData();
      setSelectedBriefId(payload.id);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Failed to generate pre-trade brief");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleChecklistItem = (item: string, checked: boolean) => {
    setChecklistStateDraft((prev) => {
      const current = prev[item] || { completed: false };
      return {
        ...prev,
        [item]: {
          completed: checked,
          completedAt: checked ? new Date().toISOString() : current.completedAt,
        },
      };
    });
  };

  const handleSaveDetail = async () => {
    if (!selectedBriefId) return;

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
      setSelectedBrief((prev) => ({ ...(prev || {}), ...updated } as PreTradeBriefRecord));

      setRecentBriefs((prev) =>
        prev.map((brief) =>
          brief.id === updated.id
            ? {
                ...brief,
                status: updated.status,
              }
            : brief
        )
      );
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Failed to save brief detail");
    } finally {
      setSavingDetail(false);
    }
  };

  const renderList = (items: string[]) => (
    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
      {items.map((item, idx) => (
        <li key={`${item}-${idx}`}>{item}</li>
      ))}
    </ul>
  );

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
                      Pair: {result.pair_symbol_snapshot} · Timeframe: {result.timeframe} · Session: {result.market_session}
                      {result.risk_reward_ratio != null ? ` · R:R ${result.risk_reward_ratio}` : ""}
                    </div>
                  </div>
                )}
              </section>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-5">
              <section className="lg:col-span-2 bg-white dark:bg-[#161B22] border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Saved Briefs</h2>
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
                            {brief.pair_symbol_snapshot} · {brief.timeframe}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                            {brief.market_session} · {brief.directional_bias_input} · {brief.status}
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
                      {renderList(selectedBrief.ai_confluence || [])}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Risks</h3>
                      {renderList(selectedBrief.ai_risks || [])}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Invalidation</h3>
                      {renderList(selectedBrief.ai_invalidators || [])}
                    </div>

                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">Checklist Progress</h3>
                      <div className="space-y-2">
                        {(selectedBrief.ai_checklist || []).map((item, idx) => {
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
