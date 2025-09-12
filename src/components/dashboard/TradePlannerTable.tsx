// components/dashboard/TradePlannerTable.tsx
"use client";

import React, { useContext, useMemo, useState } from "react";
import { TradePlanContext } from "@/context/TradePlanContext";
import type { TradePlan } from "@/types/tradePlan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pencil,
  Trash2,
  CheckCircle,
  Plus,
  Lock,
  Award,
  Zap,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * TradePlannerTable — polished:
 * - Transparent inputs (no white boxes), focus rings, textarea for notes
 * - Full-width, mobile-first layout (px padding but spans viewport)
 * - Risk/Reward visual bar per plan
 * - Premium blur overlay & upgrade CTA
 * - DeleteConfirmModal + AlertsModal + GenericModal
 * - Loading skeleton
 * - Tiers/pricing match PricingPlans (Plus $9, Pro $19, Elite $39)
 *
 * Keep logic conservative: uses TradePlanContext if available, falls back to local setPlans if provided.
 */

/* --- Tier types --- */
const TIERS = ["free", "plus", "pro", "elite"] as const;
type Tier = typeof TIERS[number];

function tierIndex(t: Tier | string) {
  const i = TIERS.indexOf((t as Tier) ?? "free");
  return i === -1 ? 0 : i;
}

/* --- Local extension of TradePlan for UI-only fields --- */
type LocalPlan = TradePlan & {
  notes?: string;
  tier?: Tier;
  createdAt?: string;
};

export default function TradePlannerTable() {
  const ctx = useContext(TradePlanContext);

  // context (with graceful fallbacks)
  const { plans = [], deletePlan, updatePlan, markExecuted, addPlan, loading = false } =
    ctx ?? {};

  // detect user's plan/tier (localStorage only since context doesn't have user)
  const userPlan: Tier = (() => {
    try {
      const candidate = typeof window !== "undefined" ? window.localStorage.getItem?.("userPlan") : null;
      if (!candidate) return "free";
      const c = String(candidate).toLowerCase();
      return (TIERS as readonly string[]).includes(c) ? (c as Tier) : "free";
    } catch {
      return "free";
    }
  })();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editableData, setEditableData] = useState<Partial<LocalPlan>>({});
  const [creating, setCreating] = useState(false);

  // new plan local state
  const [newPlan, setNewPlan] = useState<Partial<LocalPlan>>({
    symbol: "",
    setupType: "",
    plannedEntry: undefined,
    stopLoss: undefined,
    takeProfit: undefined,
    lotSize: 1,
    riskReward: undefined,
    notes: "",
    status: "planned",
    tier: "free",
  });

  // modals
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [alertsTarget, setAlertsTarget] = useState<string | null>(null);

  /* helpers */
  const computeEst = (p: Partial<LocalPlan> | LocalPlan) => {
    const e = Number(p.plannedEntry ?? 0);
    const sl = Number(p.stopLoss ?? 0);
    const tp = Number(p.takeProfit ?? 0);
    const lot = Number(p.lotSize ?? 1) || 1;
    const riskPerUnit = Number.isFinite(e) && Number.isFinite(sl) ? Math.abs(e - sl) : 0;
    const rewardPerUnit = Number.isFinite(e) && Number.isFinite(tp) ? Math.abs(tp - e) : 0;
    const estRisk = riskPerUnit * lot;
    const estReward = rewardPerUnit * lot;
    const estRR = riskPerUnit > 0 ? rewardPerUnit / riskPerUnit : NaN;
    return { riskPerUnit, rewardPerUnit, estRisk, estReward, estRR };
  };

  const PRESETS: Array<{ label: string; setupType: string; rr?: number }> = [
    { label: "Breakout", setupType: "Breakout", rr: 2 },
    { label: "Pullback", setupType: "Pullback", rr: 1.5 },
    { label: "Momentum", setupType: "Momentum", rr: 1 },
  ];

  const newPlanEst = computeEst(newPlan);

  const resetNewPlan = () =>
    setNewPlan({
      symbol: "",
      setupType: "",
      plannedEntry: undefined,
      stopLoss: undefined,
      takeProfit: undefined,
      lotSize: 1,
      riskReward: undefined,
      notes: "",
      status: "planned",
      tier: "free",
    });

  const handleCreatePlan = () => {
    if (!newPlan.symbol || !newPlan.setupType) {
      // light validation
      alert("Please provide a pair (symbol) and a strategy (setup).");
      return;
    }
    const id = `plan-${Date.now()}`;
    const payload: LocalPlan = {
      id,
      symbol: String(newPlan.symbol).toUpperCase(),
      setupType: String(newPlan.setupType),
      plannedEntry: newPlan.plannedEntry ?? 0,
      stopLoss: newPlan.stopLoss ?? 0,
      takeProfit: newPlan.takeProfit ?? 0,
      lotSize: newPlan.lotSize ?? 1,
      riskReward:
        Number.isFinite(Number(newPlan.riskReward ?? NaN)) ? Number(newPlan.riskReward) : computeEst(newPlan).estRR || 0,
      notes: String(newPlan.notes ?? ""),
      status: (newPlan.status as any) ?? "planned",
      createdAt: new Date().toISOString(),
      tier: (newPlan.tier as Tier) ?? "free",
    };

    if (typeof addPlan === "function") {
      addPlan(payload);
    } else if (typeof ctx?.createPlan === "function") {
      ctx.createPlan(payload);
    } else if (typeof ctx?.setPlans === "function") {
      ctx.setPlans((prev: LocalPlan[]) => [payload, ...(prev ?? [])]);
    } else {
      console.warn("No addPlan/createPlan/setPlans in TradePlanContext — plan not persisted.");
    }

    resetNewPlan();
    setCreating(false);
  };

  const handleEdit = (plan: LocalPlan) => {
    setEditingId(plan.id);
    setEditableData({ ...plan });
  };

  const handleSave = () => {
    if (!editingId) return;
    const payload = { ...(editableData as Partial<LocalPlan>) };
    if (typeof updatePlan === "function") {
      updatePlan(editingId, payload);
    } else if (typeof ctx?.setPlans === "function") {
      ctx.setPlans((prev: LocalPlan[]) => (prev ?? []).map((p) => (p.id === editingId ? { ...p, ...payload } : p)));
    } else {
      console.warn("updatePlan not available on context.");
    }
    setEditingId(null);
    setEditableData({});
  };

  const confirmDelete = (id: string) => setDeleteTarget(id);
  const performDelete = (id: string) => {
    if (typeof deletePlan === "function") deletePlan(id);
    else if (typeof ctx?.setPlans === "function")
      ctx.setPlans((prev: LocalPlan[]) => (prev ?? []).filter((p) => p.id !== id));
    setDeleteTarget(null);
  };

  const handleMarkExecuted = (plan: LocalPlan) => {
    if (typeof markExecuted === "function") {
      markExecuted(plan.id);
    } else if (typeof updatePlan === "function") {
      updatePlan(plan.id, { status: "executed" });
    } else if (typeof ctx?.setPlans === "function") {
      ctx.setPlans((prev: LocalPlan[]) => (prev ?? []).map((p) => (p.id === plan.id ? { ...p, status: "executed" } : p)));
    } else {
      console.warn("markExecuted / updatePlan not available");
    }
  };

  // normalize plans into LocalPlan
  const normalizedPlans: LocalPlan[] = (plans ?? []).map((p: any) => ({
    ...p,
    notes: p.notes ?? p.description ?? "",
    tier: (p.tier as Tier) ?? "free",
    createdAt: p.createdAt ?? p.created_at ?? new Date().toISOString(),
  }));

  const sortedPlans = useMemo(() => {
    return [...normalizedPlans].sort((a, b) => {
      const ta = new Date(a.createdAt ?? 0).getTime();
      const tb = new Date(b.createdAt ?? 0).getTime();
      return tb - ta;
    });
  }, [plans, normalizedPlans]);

  const featureLocked = (required: Tier) => tierIndex(userPlan) < tierIndex(required);

  /* UI helpers (styling) */
  // card style consistent with dark dashboard (like OverviewCards)
  const cardBase =
    "bg-[#071022]/60 backdrop-blur-sm rounded-lg p-4 shadow-sm transition-shadow duration-150 border border-zinc-700";

  // transparent input style used throughout (no white backgrounds)
  const inputClass =
    "bg-transparent border border-zinc-700 rounded px-3 py-2 text-sm text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-600";

  // textarea (multi-line) styled to match inputs
  const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
    <textarea
      {...props}
      rows={4}
      className={cn(inputClass, "resize-none w-full")}
    />
  );

  // small risk/reward bar visual: shows SL -> Entry -> TP within a 100px bar
  const RiskRewardBar: React.FC<{
    entry?: number;
    sl?: number;
    tp?: number;
    className?: string;
  }> = ({ entry = 0, sl = 0, tp = 0, className }) => {
    const values = [sl, entry, tp].filter((v) => Number.isFinite(v));
    if (values.length === 0) {
      return <div className={cn("h-2 rounded bg-zinc-800 w-full", className)} />;
    }
    const min = Math.min(...values);
    const max = Math.max(...values) === min ? min + 1 : Math.max(...values);
    const map = (v: number) => ((v - min) / (max - min)) * 100;

    const slPos = map(sl);
    const entryPos = map(entry);
    const tpPos = map(tp);

    // determine risk (entry - sl) and reward (tp - entry)
    const left = Math.min(slPos, entryPos);
    const right = Math.max(tpPos, entryPos);

    // bar segments: left (risk), right (reward)
    const riskWidth = Math.abs(entryPos - slPos);
    const rewardWidth = Math.abs(tpPos - entryPos);

    return (
      <div className={cn("w-full", className)}>
        <div className="h-2 rounded bg-zinc-800 relative overflow-hidden">
          {/* risk portion */}
          <div
            className="absolute top-0 bottom-0 rounded"
            style={{
              left: `${Math.min(slPos, entryPos)}%`,
              width: `${riskWidth}%`,
              background: "#7f1d1d", // red-ish
              opacity: 0.9,
            }}
            title={`Risk: ${Math.abs(entry - sl).toFixed(2)}`}
          />
          {/* reward portion */}
          <div
            className="absolute top-0 bottom-0 rounded"
            style={{
              left: `${Math.min(entryPos, tpPos)}%`,
              width: `${rewardWidth}%`,
              background: "#064e3b", // green-ish
              opacity: 0.9,
            }}
            title={`Reward: ${Math.abs(tp - entry).toFixed(2)}`}
          />
          {/* markers */}
          <div
            className="absolute -top-2 w-0.5 h-6 bg-white/80"
            style={{ left: `${entryPos}%` }}
            aria-hidden
            title={`Entry ${entry}`}
          />
          <div
            className="absolute -top-2 w-0.5 h-6 bg-white/40"
            style={{ left: `${slPos}%` }}
            aria-hidden
            title={`SL ${sl}`}
          />
          <div
            className="absolute -top-2 w-0.5 h-6 bg-white/40"
            style={{ left: `${tpPos}%` }}
            aria-hidden
            title={`TP ${tp}`}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
          <div>SL: {Number.isFinite(sl) ? sl : "—"}</div>
          <div className="text-xs">Entry: {Number.isFinite(entry) ? entry : "—"}</div>
          <div>TP: {Number.isFinite(tp) ? tp : "—"}</div>
        </div>
      </div>
    );
  };

  /* Modals */
  const GenericModal: React.FC<{ open: boolean; title?: string; onClose: () => void; children?: React.ReactNode }> = ({
    open,
    title,
    onClose,
    children,
  }) => {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative z-10 w-full max-w-lg bg-[#071022] border border-zinc-700 rounded-lg p-4 shadow-xl">
          {title && <div className="text-lg font-semibold text-white mb-2">{title}</div>}
          <div>{children}</div>
          <div className="mt-4 flex justify-end">
            <Button size="sm" variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const DeleteConfirmModal: React.FC<{ id: string | null; onCancel: () => void; onConfirm: (id: string) => void }> = ({
    id,
    onCancel,
    onConfirm,
  }) => {
    if (!id) return null;
    return (
      <GenericModal open={!!id} title="Delete plan?" onClose={onCancel}>
        <div className="text-sm text-zinc-300">
          Are you sure you want to permanently delete this trade plan? This action cannot be undone.
        </div>
        <div className="mt-4 flex gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => onConfirm(id)}>
            Delete
          </Button>
        </div>
      </GenericModal>
    );
  };

  const AlertsModal: React.FC<{ id: string | null; onClose: () => void }> = ({ id, onClose }) => {
    const plan = id ? normalizedPlans.find((p) => p.id === id) : null;
    const [enabled, setEnabled] = useState(true);
    const [price, setPrice] = useState<string>("");
    if (!id || !plan) return null;
    return (
      <GenericModal open={!!id} title={`Alerts — ${plan.symbol}`} onClose={onClose}>
        <div className="text-sm text-zinc-300">Create price alerts or execution reminders for this plan.</div>

        <div className="mt-3 grid grid-cols-1 gap-2">
          <label className="text-xs text-zinc-400">Alert price</label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. 42000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={inputClass}
            />
            <Button size="sm" variant="ghost" onClick={() => alert("Saved (demo)")}>
              Save
            </Button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <input id="en" type="checkbox" checked={enabled} onChange={() => setEnabled((s) => !s)} />
          <label htmlFor="en" className="text-sm text-zinc-300">
            Enable email reminders
          </label>
        </div>
      </GenericModal>
    );
  };

  /* Skeleton */
  const SkeletonCard = () => (
    <div className={cn(cardBase, "animate-pulse")}>
      <div className="h-5 bg-zinc-800 rounded w-1/3 mb-3" />
      <div className="h-3 bg-zinc-800 rounded w-full mb-2" />
      <div className="h-3 bg-zinc-800 rounded w-full mb-2" />
      <div className="h-3 bg-zinc-800 rounded w-2/3 mb-2" />
      <div className="flex gap-2 mt-4">
        <div className="h-9 w-24 bg-zinc-800 rounded" />
        <div className="h-9 w-24 bg-zinc-800 rounded" />
      </div>
    </div>
  );

  /* layout: full-width mobile-first */
  return (
    <div className="w-full mt-6 space-y-6 px-4 sm:px-6 lg:px-8">
      {/* header */}
      <div className="w-full max-w-full mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">📈 Trade Planner</h2>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Plan trades, estimate risk & reward, track ideas, and upgrade for automation & analytics.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-300">
              <div className="px-3 py-2 rounded bg-zinc-800">
                <div className="text-[11px]">Plans</div>
                <div className="font-medium">{(plans ?? []).length}</div>
              </div>
              <div className="px-3 py-2 rounded bg-zinc-800">
                <div className="text-[11px]">Tier</div>
                <div className="font-medium capitalize">{userPlan}</div>
              </div>
            </div>

            <Button
              size="sm"
              variant="default"
              onClick={() => {
                setCreating((c) => !c);
                if (!creating) resetNewPlan();
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Plan
            </Button>
          </div>
        </div>
      </div>

      {/* skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* create form */}
      {!loading && creating && (
        <div className={cardBase}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-zinc-400">Pair / Symbol</label>
              <Input
                placeholder="BTCUSD"
                value={newPlan.symbol ?? ""}
                onChange={(e) => setNewPlan((p) => ({ ...p, symbol: e.target.value }))}
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400">Strategy / Setup</label>
              <Input
                placeholder="Pullback"
                value={newPlan.setupType ?? ""}
                onChange={(e) => setNewPlan((p) => ({ ...p, setupType: e.target.value }))}
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400">Lot Size</label>
              <Input
                type="number"
                min={0.01}
                step={0.01}
                value={String(newPlan.lotSize ?? 1)}
                onChange={(e) => setNewPlan((p) => ({ ...p, lotSize: Number(e.target.value) }))}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-3">
            <div>
              <label className="text-xs text-zinc-400">Planned Entry</label>
              <Input
                type="number"
                value={String(newPlan.plannedEntry ?? "")}
                onChange={(e) => setNewPlan((p) => ({ ...p, plannedEntry: Number(e.target.value) }))}
                className={inputClass}
                placeholder="Entry"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400">Stop Loss</label>
              <Input
                type="number"
                value={String(newPlan.stopLoss ?? "")}
                onChange={(e) => setNewPlan((p) => ({ ...p, stopLoss: Number(e.target.value) }))}
                className={inputClass}
                placeholder="SL"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400">Take Profit</label>
              <Input
                type="number"
                value={String(newPlan.takeProfit ?? "")}
                onChange={(e) => setNewPlan((p) => ({ ...p, takeProfit: Number(e.target.value) }))}
                className={inputClass}
                placeholder="TP"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400">Planned RR</label>
              <Input
                type="number"
                value={String(newPlan.riskReward ?? "")}
                onChange={(e) => setNewPlan((p) => ({ ...p, riskReward: Number(e.target.value) }))}
                className={inputClass}
                placeholder="e.g. 2"
              />
            </div>

            <div className="sm:col-span-2 md:col-span-2">
              <label className="text-xs text-zinc-400">Notes</label>
              <Textarea
                value={newPlan.notes ?? ""}
                onChange={(e) => setNewPlan((p) => ({ ...p, notes: e.target.value }))}
                className="bg-transparent border border-zinc-700 rounded px-3 py-2 text-sm text-white placeholder:text-zinc-400"
                placeholder="Trade idea notes..."
              />
            </div>

            <div className="flex items-end gap-2 justify-end">
              <div className="text-xs text-zinc-400 mr-auto">
                <div>
                  Est. Risk: <span className="font-medium">${newPlanEst.estRisk.toFixed(2)}</span>
                </div>
                <div>
                  Est. Reward: <span className="font-medium">${newPlanEst.estReward.toFixed(2)}</span>
                </div>
                <div>
                  Est. RR:{" "}
                  <span className="font-medium">
                    {Number.isFinite(newPlanEst.estRR) ? newPlanEst.estRR.toFixed(2) : "—"}
                  </span>
                </div>
              </div>

              <Button size="sm" variant="ghost" onClick={() => resetNewPlan()}>
                Reset
              </Button>
              <Button size="sm" onClick={handleCreatePlan}>
                Save Plan
              </Button>
            </div>
          </div>

          <div className="mt-3 flex gap-2 items-center">
            <div className="text-xs text-zinc-400 mr-2">Presets:</div>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                className="px-3 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700"
                onClick={() => setNewPlan((cur) => ({ ...cur, setupType: p.setupType, riskReward: p.rr ?? cur.riskReward }))}
              >
                {p.label}
              </button>
            ))}

            <div className="ml-auto text-xs text-zinc-400">
              Unlock advanced automated alerts in <span className="font-medium capitalize">{userPlan}</span>+
            </div>
          </div>
        </div>
      )}

      {/* planner list */}
      <div className="grid grid-cols-1 gap-4">
        {sortedPlans.length === 0 && !loading ? (
          <div className="text-sm text-zinc-400">No plans yet — click "New Plan" to start.</div>
        ) : (
          sortedPlans.map((plan: LocalPlan) => {
            const est = computeEst(plan);
            const isEditing = editingId === plan.id;
            const lockedAdvanced = featureLocked(plan.tier ?? "free");

            return (
              <div key={plan.id} className={cn(cardBase, "relative overflow-hidden")}>
                {/* premium blur overlay */}
                {lockedAdvanced && (
                  <div
                    className="absolute inset-0 z-20 flex items-center justify-center"
                    style={{ background: "linear-gradient(180deg, rgba(2,6,23,0.55), rgba(2,6,23,0.55))", backdropFilter: "blur(6px)" }}
                  >
                    <div className="text-center text-white space-y-3 px-4">
                      <Lock className="mx-auto w-6 h-6 text-yellow-300" />
                      <div className="font-semibold">Premium feature</div>
                      <div className="text-xs opacity-80">This plan uses features available in a higher tier.</div>
                      <div className="mt-2 flex gap-2 justify-center">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => (ctx?.openUpgrade ? ctx.openUpgrade() : (window.location.href = "/pricing"))}
                        >
                          Upgrade
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { try { (window as any).location.hash = '#upgrade'; } catch {} }}>
                          Learn more
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 z-10 relative">
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded px-2 py-1 bg-zinc-900/40 text-sm font-semibold">{plan.symbol}</div>
                        <div className="text-sm text-zinc-300">{plan.setupType}</div>
                        <div className="text-xs ml-2 px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">{plan.tier ?? "free"}</div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-zinc-400">Status</div>
                        <div className="font-medium capitalize">{plan.status}</div>
                      </div>
                    </div>

                    {/* numeric fields */}
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-zinc-400">Entry</div>
                        {isEditing ? (
                          <Input
                            className={inputClass}
                            type="number"
                            value={String(editableData.plannedEntry ?? "")}
                            onChange={(e) => setEditableData((d) => ({ ...d, plannedEntry: Number(e.target.value) }))}
                          />
                        ) : (
                          <div className="font-semibold">{plan.plannedEntry ?? "—"}</div>
                        )}
                      </div>

                      <div>
                        <div className="text-xs text-zinc-400">SL</div>
                        {isEditing ? (
                          <Input
                            className={inputClass}
                            type="number"
                            value={String(editableData.stopLoss ?? "")}
                            onChange={(e) => setEditableData((d) => ({ ...d, stopLoss: Number(e.target.value) }))}
                          />
                        ) : (
                          <div className="font-semibold">{plan.stopLoss ?? "—"}</div>
                        )}
                      </div>

                      <div>
                        <div className="text-xs text-zinc-400">TP</div>
                        {isEditing ? (
                          <Input
                            className={inputClass}
                            type="number"
                            value={String(editableData.takeProfit ?? "")}
                            onChange={(e) => setEditableData((d) => ({ ...d, takeProfit: Number(e.target.value) }))}
                          />
                        ) : (
                          <div className="font-semibold">{plan.takeProfit ?? "—"}</div>
                        )}
                      </div>

                      <div>
                        <div className="text-xs text-zinc-400">Lot</div>
                        {isEditing ? (
                          <Input
                            className={inputClass}
                            type="number"
                            value={String(editableData.lotSize ?? plan.lotSize ?? 1)}
                            onChange={(e) => setEditableData((d) => ({ ...d, lotSize: Number(e.target.value) }))}
                          />
                        ) : (
                          <div className="font-semibold">{plan.lotSize}</div>
                        )}
                      </div>
                    </div>

                    {/* risk reward bar */}
                    <div className="mt-4">
                      <RiskRewardBar entry={Number(plan.plannedEntry ?? 0)} sl={Number(plan.stopLoss ?? 0)} tp={Number(plan.takeProfit ?? 0)} />
                    </div>

                    {/* computed stats */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                      <div className="px-2 py-1 rounded bg-zinc-900/40">Risk/unit: <span className="font-medium">${est.riskPerUnit.toFixed(2)}</span></div>
                      <div className="px-2 py-1 rounded bg-zinc-900/40">Reward/unit: <span className="font-medium">${est.rewardPerUnit.toFixed(2)}</span></div>
                      <div className="px-2 py-1 rounded bg-zinc-900/40">Est. Risk: <span className="font-medium">${est.estRisk.toFixed(2)}</span></div>
                      <div className="px-2 py-1 rounded bg-zinc-900/40">Est. Reward: <span className="font-medium">${est.estReward.toFixed(2)}</span></div>
                      <div className="px-2 py-1 rounded bg-zinc-900/40">RR: <span className="font-medium">{Number.isFinite(est.estRR) ? est.estRR.toFixed(2) : "—"}</span></div>
                    </div>

                    {/* notes */}
                    <div className="mt-3">
                      <div className="text-xs text-zinc-400">Notes</div>
                      {isEditing ? (
                        <Textarea
                          value={String(editableData.notes ?? "")}
                          onChange={(e) => setEditableData((d) => ({ ...d, notes: e.target.value }))}
                          className="mt-1"
                        />
                      ) : (
                        <div className="text-sm text-zinc-300 mt-1 whitespace-pre-wrap">{plan.notes ?? "—"}</div>
                      )}
                    </div>
                  </div>

                  {/* actions & meta */}
                  <div className="flex flex-col items-end gap-3">
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditableData({}); }}>Cancel</Button>
                          <Button size="sm" onClick={handleSave}>Save</Button>
                        </>
                      ) : (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(plan)} aria-label="Edit plan">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => confirmDelete(plan.id)} aria-label="Delete plan">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                          {plan.status !== "executed" && (
                            <Button size="icon" variant="ghost" onClick={() => handleMarkExecuted(plan)} aria-label="Mark executed">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>

                    <div className="text-xs text-zinc-400 text-right">
                      <div>Created: <span className="font-medium">{new Date(plan.createdAt ?? "").toLocaleString()}</span></div>
                      <div>Tier: <span className="font-medium capitalize">{plan.tier ?? "free"}</span></div>
                    </div>

                    <div className="mt-2 flex flex-col gap-2 items-end">
                      <button className="flex items-center gap-2 text-xs text-zinc-300" onClick={() => setAlertsTarget(plan.id)}>
                        <Zap className="w-4 h-4 text-yellow-400" /> Auto alerts
                        <span className="ml-1 px-2 py-0.5 rounded text-xs bg-zinc-800">coming</span>
                      </button>

                      <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-300" /> Performance insights
                        <span className="ml-1 px-2 py-0.5 rounded text-xs bg-zinc-800">Pro+</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* advanced visual row */}
                <div className="mt-4 border-t border-zinc-700 pt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-yellow-300" />
                      <div className="text-sm font-medium">Advanced Tools</div>
                      <div className="text-xs text-zinc-400">visualize risk, set alerts & templates</div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <div className="px-2 py-1 rounded bg-zinc-800 text-zinc-300">Templates</div>
                      <div className="px-2 py-1 rounded bg-zinc-800 text-zinc-300">Signals</div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 rounded bg-[#0b1220]/50 border border-zinc-800">
                      <div className="text-xs text-zinc-400">Templates</div>
                      <div className="text-sm font-medium mt-1">Save & reuse trade templates</div>
                      <div className="text-xs text-zinc-400 mt-2">Save time creating common setups.</div>
                    </div>

                    <div className="p-3 rounded bg-[#0b1220]/50 border border-zinc-800">
                      <div className="text-xs text-zinc-400">Alerts</div>
                      <div className="text-sm font-medium mt-1">Price alerts & execution reminders</div>
                      <div className="text-xs text-zinc-400 mt-2">Get notified when price hits your zones.</div>
                    </div>

                    <div className="p-3 rounded bg-[#0b1220]/50 border border-zinc-800">
                      <div className="text-xs text-zinc-400">Backtest (basic)</div>
                      <div className="text-sm font-medium mt-1">Simulate historical performance</div>
                      <div className="text-xs text-zinc-400 mt-2">Understand how setups performed historically.</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* tier upsell row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { id: "plus", title: "Plus", desc: "Extra templates & alerts", price: "$9/mo", icon: Zap },
          { id: "pro", title: "Pro", desc: "Backtests & insights", price: "$19/mo", icon: Star },
          { id: "elite", title: "Elite", desc: "Full automation & priority", price: "$39/mo", icon: Award },
        ].map((tier) => {
          const locked = featureLocked(tier.id as Tier);
          const Icon = tier.icon;
          return (
            <div key={tier.id} className={cn(cardBase, "relative overflow-hidden flex flex-col justify-between")}>
              {locked && (
                <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: "rgba(2,6,23,0.55)", backdropFilter: "blur(4px)" }}>
                  <div className="text-center text-white px-4">
                    <Lock className="mx-auto w-6 h-6 text-yellow-300" />
                    <div className="font-semibold mt-2">Upgrade to {tier.title}</div>
                    <div className="text-xs mt-1 text-zinc-200">Unlock advanced features for traders</div>
                    <div className="mt-3">
                      <Button size="sm" onClick={() => (ctx?.openUpgrade ? ctx.openUpgrade() : (window.location.href = "/pricing"))}>
                        Upgrade
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="rounded-full p-2 bg-zinc-900/40"><Icon className="w-5 h-5 text-yellow-300" /></div>
                <div>
                  <div className="text-sm font-medium">{tier.title}</div>
                  <div className="text-xs text-zinc-400">{tier.desc}</div>
                </div>
                <div className="ml-auto text-sm font-semibold">{tier.price}</div>
              </div>

              <div className="mt-3 text-xs text-zinc-400">
                <ul className="list-disc ml-4 space-y-1">
                  <li>Save templates</li>
                  <li>Price alerts</li>
                  <li>Basic backtest (Pro+)</li>
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* modals */}
      <DeleteConfirmModal id={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={performDelete} />
      <AlertsModal id={alertsTarget} onClose={() => setAlertsTarget(null)} />
    </div>
  );
}
