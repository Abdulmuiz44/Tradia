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
 * Updated Trade Planner:
 * - Fixes TypeScript errors by using a local extended plan type (LocalPlan)
 * - Delete confirmation modal instead of confirm()
 * - Alerts modal wired to "Auto alerts" button
 * - Small skeleton when ctx.loading is true
 * - All changes keep visuals consistent with OverviewCards
 */

/* ---------- local helpers / types ---------- */
// allow some extra UI-only fields while keeping original TradePlan untouched
type LocalPlan = TradePlan & {
  notes?: string;
  tier?: string;
  createdAt?: string;
};

const TIERS = ["free", "plus", "pro", "elite"] as const;
type Tier = typeof TIERS[number];
function tierIndex(t: Tier | string) {
  const i = TIERS.indexOf((t as Tier) ?? "free");
  return i === -1 ? 0 : i;
}

/* ---------- small reusable modal ---------- */
function GenericModal({
  isOpen,
  title,
  onClose,
  children,
  actions,
}: {
  isOpen: boolean;
  title?: string;
  onClose: () => void;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-slate-900 rounded-md p-4 shadow-lg">
        {title && <div className="text-lg font-semibold mb-2">{title}</div>}
        <div className="mb-4 text-sm text-zinc-300">{children}</div>
        <div className="flex justify-end gap-2">{actions}</div>
      </div>
    </div>
  );
}

/* ---------- Delete confirmation modal ---------- */
function DeleteConfirmModal({
  isOpen,
  name,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  name?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <GenericModal
      isOpen={isOpen}
      title="Delete trade plan"
      onClose={onCancel}
      actions={
        <>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={onConfirm}>
            Delete
          </Button>
        </>
      }
    >
      <div>
        Are you sure you want to delete <span className="font-semibold">{name}</span>? This action cannot be undone.
      </div>
    </GenericModal>
  );
}

/* ---------- Alerts modal (simple) ---------- */
function AlertsModal({
  isOpen,
  plan,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  plan?: LocalPlan | null;
  onClose: () => void;
  onSave: (payload: { enabled: boolean; channel: string }) => void;
}) {
  const [enabled, setEnabled] = useState(true);
  const [channel, setChannel] = useState("in-app");

  if (!isOpen) return null;
  return (
    <GenericModal
      isOpen={isOpen}
      title={`Alerts — ${plan?.symbol ?? ""}`}
      onClose={onClose}
      actions={
        <>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onSave({ enabled, channel });
              onClose();
            }}
          >
            Save Alerts
          </Button>
        </>
      }
    >
      <div className="text-sm text-zinc-300 space-y-3">
        <div>
          <label className="text-xs text-zinc-400 block">Enable alerts</label>
          <div className="mt-1 flex items-center gap-2">
            <button
              className={cn("px-3 py-1 rounded", enabled ? "bg-green-600" : "bg-zinc-800")}
              onClick={() => setEnabled(true)}
            >
              Enabled
            </button>
            <button
              className={cn("px-3 py-1 rounded", !enabled ? "bg-red-600" : "bg-zinc-800")}
              onClick={() => setEnabled(false)}
            >
              Disabled
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-400 block">Channel</label>
          <div className="mt-1 flex items-center gap-2">
            <button className={cn("px-3 py-1 rounded", channel === "in-app" ? "bg-sky-600" : "bg-zinc-800")} onClick={() => setChannel("in-app")}>In-app</button>
            <button className={cn("px-3 py-1 rounded", channel === "email" ? "bg-sky-600" : "bg-zinc-800")} onClick={() => setChannel("email")}>Email</button>
            <button className={cn("px-3 py-1 rounded", channel === "sms" ? "bg-sky-600" : "bg-zinc-800")} onClick={() => setChannel("sms")}>SMS</button>
          </div>
          <div className="text-xs text-zinc-500 mt-2">Note: SMS/email require a paid plan.</div>
        </div>
      </div>
    </GenericModal>
  );
}

/* ---------- skeleton for loading state ---------- */
function PlanSkeleton() {
  return (
    <div className="animate-pulse p-3 bg-white/4 rounded-md border border-zinc-700 h-36" />
  );
}

export default function TradePlannerTable() {
  const ctx = useContext(TradePlanContext) as any;
  // expected from context: plans[], deletePlan, updatePlan, markExecuted, addPlan/createPlan, openUpgrade, loading...
  const { plans = [], deletePlan, updatePlan, markExecuted, addPlan } = ctx ?? {};

  // prefer ctx.loading if available
  const loading = Boolean(ctx?.loading);

  // We use an extended local plan type for ui-friendly optional fields
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editableData, setEditableData] = useState<Partial<LocalPlan>>({});
  const [creating, setCreating] = useState(false);

  // New plan form state (LocalPlan partial)
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
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name?: string } | null>(null);
  const [alertsFor, setAlertsFor] = useState<LocalPlan | null>(null);

  // detect user's plan/tier (tries ctx.user?.plan then localStorage)
  const userPlan: Tier = (() => {
    try {
      const candidate = ctx?.user?.plan ?? (typeof window !== "undefined" ? window.localStorage.getItem("userPlan") : null);
      if (!candidate) return "free";
      const c = String(candidate).toLowerCase();
      if ((TIERS as readonly string[]).includes(c)) return c as Tier;
      return "free";
    } catch {
      return "free";
    }
  })();

  // helper: compute risk & potential reward based on numeric fields (if available)
  const computeEst = (p: Partial<LocalPlan>) => {
    const e = Number(p.plannedEntry ?? 0);
    const sl = Number(p.stopLoss ?? 0);
    const tp = Number(p.takeProfit ?? 0);
    const lot = Number(p.lotSize ?? 1) || 1;
    const riskPerUnit = isFinite(e) && isFinite(sl) ? Math.abs(e - sl) : 0;
    const rewardPerUnit = isFinite(e) && isFinite(tp) ? Math.abs(tp - e) : 0;
    const estRisk = riskPerUnit * lot;
    const estReward = rewardPerUnit * lot;
    const estRR = riskPerUnit > 0 ? rewardPerUnit / riskPerUnit : NaN;
    return { riskPerUnit, rewardPerUnit, estRisk, estReward, estRR };
  };

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
      alert("Please enter at least a pair (symbol) and strategy (setup).");
      return;
    }
    const id = `plan-${Date.now()}`;
    const payload: LocalPlan = {
      id,
      symbol: String(newPlan.symbol).toUpperCase(),
      setupType: String(newPlan.setupType),
      plannedEntry: Number(newPlan.plannedEntry ?? 0),
      stopLoss: Number(newPlan.stopLoss ?? 0),
      takeProfit: Number(newPlan.takeProfit ?? 0),
      lotSize: Number(newPlan.lotSize ?? 1),
      // try to use specified riskReward else compute
      riskReward:
        Number.isFinite(Number(newPlan.riskReward ?? NaN))
          ? Number(newPlan.riskReward)
          : computeEst(newPlan).estRR || 0,
      notes: String(newPlan.notes ?? ""),
      status: (String(newPlan.status ?? "planned") as LocalPlan["status"]),
      createdAt: new Date().toISOString(),
      tier: (newPlan.tier as string) ?? "free",
    };

    if (typeof addPlan === "function") {
      addPlan(payload);
    } else if (typeof ctx?.createPlan === "function") {
      ctx.createPlan(payload);
    } else if (typeof ctx?.setPlans === "function") {
      // best-effort fallback (not ideal, but avoids losing the plan)
      ctx.setPlans((prev: LocalPlan[]) => [payload, ...(prev ?? [])]);
    } else {
      console.warn("No addPlan/createPlan API found on TradePlanContext — plan not persisted.");
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
    const payload = { ...(editableData as Partial<LocalPlan>) } as Partial<LocalPlan>;
    if (typeof updatePlan === "function") {
      updatePlan(editingId, payload);
    } else {
      console.warn("updatePlan not available on context.");
    }
    setEditingId(null);
    setEditableData({});
  };

  const handleDeleteConfirmed = async (id: string | undefined) => {
    if (!id) return;
    if (typeof deletePlan === "function") deletePlan(id);
    setDeleteTarget(null);
  };

  const handleMarkExecuted = (plan: LocalPlan) => {
    if (typeof markExecuted === "function") {
      markExecuted(plan.id);
    } else if (typeof updatePlan === "function") {
      updatePlan(plan.id, { status: "executed" } as any);
    } else {
      console.warn("markExecuted / updatePlan not available");
    }
  };

  const PRESETS: Array<{ label: string; setupType: string; rr?: number }> = [
    { label: "Breakout", setupType: "Breakout", rr: 2 },
    { label: "Pullback", setupType: "Pullback", rr: 1.5 },
    { label: "Momentum", setupType: "Momentum", rr: 1 },
  ];

  // sort plans by newest first and cast to LocalPlan[]
  const sortedPlans = useMemo(() => {
    const pArr = (plans ?? []) as LocalPlan[];
    return [...pArr].sort((a, b) => {
      const ta = new Date(a.createdAt ?? 0).getTime();
      const tb = new Date(b.createdAt ?? 0).getTime();
      return tb - ta;
    });
  }, [plans]);

  const featureLocked = (required: Tier) => tierIndex(userPlan) < tierIndex(required);

  const cardBase =
    "bg-white/4 backdrop-blur-sm rounded-md p-3 shadow-sm transition-shadow duration-150 border border-zinc-700";

  return (
    <div className="w-full mt-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">📈 Trade Planner</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Plan trades, estimate risk & reward, and track ideas. Upgrade for advanced features.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-300">
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

      {/* New plan form */}
      {creating && (
        <div className={`${cardBase}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <label className="text-xs text-zinc-400">Pair / Symbol</label>
              <Input
                placeholder="e.g. BTCUSD"
                value={newPlan.symbol ?? ""}
                onChange={(e) => setNewPlan((p) => ({ ...p, symbol: e.target.value }))}
                className="bg-muted/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-zinc-400">Strategy / Setup</label>
              <Input
                placeholder="e.g. Pullback"
                value={newPlan.setupType ?? ""}
                onChange={(e) => setNewPlan((p) => ({ ...p, setupType: e.target.value }))}
                className="bg-muted/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-zinc-400">Lot Size</label>
              <Input
                type="number"
                min={0.01}
                step={0.01}
                value={String(newPlan.lotSize ?? 1)}
                onChange={(e) => setNewPlan((p) => ({ ...p, lotSize: Number(e.target.value) }))}
                className="bg-muted/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-3">
            <div className="space-y-2">
              <label className="text-xs text-zinc-400">Planned Entry</label>
              <Input
                type="number"
                value={String(newPlan.plannedEntry ?? "")}
                onChange={(e) => setNewPlan((p) => ({ ...p, plannedEntry: Number(e.target.value) }))}
                className="bg-muted/20"
                placeholder="Entry price"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-zinc-400">Stop Loss</label>
              <Input
                type="number"
                value={String(newPlan.stopLoss ?? "")}
                onChange={(e) => setNewPlan((p) => ({ ...p, stopLoss: Number(e.target.value) }))}
                className="bg-muted/20"
                placeholder="Stop price"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-zinc-400">Take Profit</label>
              <Input
                type="number"
                value={String(newPlan.takeProfit ?? "")}
                onChange={(e) => setNewPlan((p) => ({ ...p, takeProfit: Number(e.target.value) }))}
                className="bg-muted/20"
                placeholder="TP price"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-zinc-400">Planned RR</label>
              <Input
                type="number"
                value={String(newPlan.riskReward ?? "")}
                onChange={(e) => setNewPlan((p) => ({ ...p, riskReward: Number(e.target.value) }))}
                className="bg-muted/20"
                placeholder="e.g. 2"
              />
            </div>

            <div className="space-y-2 col-span-1 sm:col-span-2 md:col-span-2">
              <label className="text-xs text-zinc-400">Notes</label>
              <Input
                value={String(newPlan.notes ?? "")}
                onChange={(e) => setNewPlan((p) => ({ ...p, notes: e.target.value }))}
                className="bg-muted/20"
                placeholder="Trade idea notes..."
              />
            </div>

            <div className="flex items-end gap-2 justify-end">
              <div className="text-xs text-zinc-400 mr-auto">
                <div>Est. Risk: <span className="font-medium">${newPlanEst.estRisk.toFixed(2)}</span></div>
                <div>Est. Reward: <span className="font-medium">${newPlanEst.estReward.toFixed(2)}</span></div>
                <div>Est. RR: <span className="font-medium">{Number.isFinite(newPlanEst.estRR) ? newPlanEst.estRR.toFixed(2) : "—"}</span></div>
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
                onClick={() =>
                  setNewPlan((cur) => ({
                    ...cur,
                    setupType: p.setupType,
                    riskReward: p.rr ?? cur.riskReward,
                  }))
                }
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

      {/* Planner list / skeleton */}
      <div className="grid gap-3">
        {loading ? (
          <div className="grid gap-3">
            <PlanSkeleton />
            <PlanSkeleton />
            <PlanSkeleton />
          </div>
        ) : sortedPlans.length === 0 ? (
          <div className="text-sm text-zinc-400">No plans yet — use "New Plan" to start.</div>
        ) : (
          sortedPlans.map((plan: LocalPlan) => {
            const est = computeEst(plan);
            const isEditing = editingId === plan.id;
            // treat missing tier as free
            const planTier = (plan.tier as Tier) ?? "free";
            const lockedAdvanced = tierIndex(userPlan) < tierIndex(planTier);

            return (
              <div key={plan.id} className={cn(cardBase, "relative overflow-hidden")}>
                {lockedAdvanced && (
                  <div
                    className="absolute inset-0 z-20 flex items-center justify-center"
                    style={{ background: "rgba(2,6,23,0.55)", backdropFilter: "blur(4px)" }}
                  >
                    <div className="text-center text-white space-y-2 px-4">
                      <Lock className="mx-auto w-6 h-6 text-yellow-300" />
                      <div className="font-semibold">Premium feature</div>
                      <div className="text-xs opacity-80">This plan uses features available in a higher tier.</div>
                      <div className="mt-2 flex gap-2 justify-center">
                        <Button size="sm" variant="default" onClick={() => (ctx?.openUpgrade ? ctx.openUpgrade() : (window.location.href = "/pricing"))}>
                          Upgrade
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => alert("Previewing disabled: upgrade to access")}>
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
                        <div className="rounded px-2 py-1 bg-white/6 text-sm font-medium">{plan.symbol}</div>
                        <div className="text-sm text-zinc-400">{plan.setupType}</div>
                        <div className="text-xs ml-2 px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">{planTier ?? "free"}</div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-zinc-400">Status</div>
                        <div className="font-medium capitalize">{plan.status}</div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <div className="text-xs text-zinc-400">Entry</div>
                        {isEditing ? (
                          <Input
                            className="mt-1 bg-muted/20"
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
                            className="mt-1 bg-muted/20"
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
                            className="mt-1 bg-muted/20"
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
                            className="mt-1 bg-muted/20"
                            type="number"
                            value={String(editableData.lotSize ?? plan.lotSize ?? 1)}
                            onChange={(e) => setEditableData((d) => ({ ...d, lotSize: Number(e.target.value) }))}
                          />
                        ) : (
                          <div className="font-semibold">{plan.lotSize}</div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                      <div className="px-2 py-1 rounded bg-zinc-900/40">
                        Risk/unit: <span className="font-medium">${est.riskPerUnit.toFixed(2)}</span>
                      </div>
                      <div className="px-2 py-1 rounded bg-zinc-900/40">
                        Reward/unit: <span className="font-medium">${est.rewardPerUnit.toFixed(2)}</span>
                      </div>
                      <div className="px-2 py-1 rounded bg-zinc-900/40">
                        Est. Risk: <span className="font-medium">${est.estRisk.toFixed(2)}</span>
                      </div>
                      <div className="px-2 py-1 rounded bg-zinc-900/40">
                        Est. Reward: <span className="font-medium">${est.estReward.toFixed(2)}</span>
                      </div>
                      <div className="px-2 py-1 rounded bg-zinc-900/40">
                        RR: <span className="font-medium">{Number.isFinite(est.estRR) ? est.estRR.toFixed(2) : "—"}</span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="text-xs text-zinc-400">Notes</div>
                      {isEditing ? (
                        <Input
                          className="mt-1 bg-muted/20"
                          value={String(editableData.notes ?? "")}
                          onChange={(e) => setEditableData((d) => ({ ...d, notes: e.target.value }))}
                        />
                      ) : (
                        <div className="text-sm text-zinc-300 mt-1 truncate">{plan.notes ?? "—"}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditableData({}); }}>
                            Cancel
                          </Button>
                          <Button size="sm" onClick={handleSave}>Save</Button>
                        </>
                      ) : (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(plan)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setDeleteTarget({ id: plan.id, name: plan.symbol })}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                          {plan.status !== "executed" && (
                            <Button size="icon" variant="ghost" onClick={() => handleMarkExecuted(plan)}>
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>

                    <div className="text-xs text-zinc-400">
                      <div>Created: <span className="font-medium">{new Date(plan.createdAt ?? "").toLocaleString()}</span></div>
                      <div>Tier: <span className="font-medium capitalize">{planTier ?? "free"}</span></div>
                    </div>

                    <div className="mt-2 flex flex-col gap-2">
                      <button
                        className="text-[11px] text-zinc-400 flex items-center gap-2 px-2 py-1 rounded bg-zinc-900/30"
                        onClick={() => setAlertsFor(plan)}
                      >
                        <Zap className="w-4 h-4 text-yellow-400" /> Auto alerts
                      </button>
                      <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-300" /> Performance insights
                        <span className="ml-1 px-2 py-0.5 rounded text-xs bg-zinc-800">Pro+</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* advanced box (non-functional placeholder) */}
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
                    <div className="p-3 bg-white/3 rounded">
                      <div className="text-xs text-zinc-400">Templates</div>
                      <div className="text-sm font-medium mt-1">Save & reuse trade templates</div>
                      <div className="text-xs text-zinc-400 mt-2">Save time creating common setups.</div>
                    </div>

                    <div className="p-3 bg-white/3 rounded">
                      <div className="text-xs text-zinc-400">Alerts</div>
                      <div className="text-sm font-medium mt-1">Price alerts & execution reminders</div>
                      <div className="text-xs text-zinc-400 mt-2">Get notified when price hits your zones.</div>
                    </div>

                    <div className="p-3 bg-white/3 rounded">
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

      {/* Tiers upsell row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { id: "plus", title: "Plus", desc: "Extra templates & alerts", price: "$6/mo", icon: Zap },
          { id: "pro", title: "Pro", desc: "Backtests & insights", price: "$15/mo", icon: Star },
          { id: "elite", title: "Elite", desc: "Full automation & priority", price: "$49/mo", icon: Award },
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
                <div className="rounded-full p-2 bg-white/6"><Icon className="w-5 h-5 text-yellow-300" /></div>
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
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        name={deleteTarget?.name}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => handleDeleteConfirmed(deleteTarget?.id)}
      />

      <AlertsModal
        isOpen={!!alertsFor}
        plan={alertsFor}
        onClose={() => setAlertsFor(null)}
        onSave={(payload) => {
          // send to context or server — best-effort
          if (typeof ctx?.savePlanAlerts === "function" && alertsFor) {
            ctx.savePlanAlerts(alertsFor.id, payload);
          } else {
            console.info("Alert saved (local):", alertsFor?.id, payload);
          }
        }}
      />
    </div>
  );
}
