"use client";

import { createContext, useState, useEffect, useContext, ReactNode } from "react";
import type { TradePlan } from "@/types/tradePlan";

interface TradePlanContextType {
  plans: TradePlan[];
  loading?: boolean;
  addPlan: (plan: Omit<TradePlan, "id" | "createdAt">) => void;
  updatePlan: (id: string, updatedPlan: Partial<TradePlan>) => void;
  deletePlan: (id: string) => void;
  markExecuted: (id: string) => void;
  createPlan?: (plan: Omit<TradePlan, "id" | "createdAt">) => void;
  setPlans?: (plans: TradePlan[] | ((prev: TradePlan[]) => TradePlan[])) => void;
  openUpgrade?: () => void;
}

export const TradePlanContext = createContext<TradePlanContextType | undefined>(undefined);

export const TradePlanProvider = ({ children }: { children: ReactNode }) => {
  const [plans, setPlans] = useState<TradePlan[]>([]);

  // Load from cloud on mount, fallback to local cache
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/trade-plans', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && Array.isArray(data?.plans)) setPlans(data.plans);
        } else {
          // fallback to local cache
          const stored = typeof window !== 'undefined' ? localStorage.getItem('tradePlans') : null;
          if (!cancelled && stored) setPlans(JSON.parse(stored));
        }
      } catch {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('tradePlans') : null;
        if (!cancelled && stored) setPlans(JSON.parse(stored));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Cache to localStorage as a best-effort client cache
  useEffect(() => {
    try { if (typeof window !== 'undefined') localStorage.setItem('tradePlans', JSON.stringify(plans)); } catch {}
  }, [plans]);

  const addPlan = async (plan: Omit<TradePlan, "id" | "createdAt">) => {
    try {
      const res = await fetch('/api/trade-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: plan.symbol,
          setupType: plan.setupType,
          plannedEntry: plan.plannedEntry,
          stopLoss: plan.stopLoss,
          takeProfit: plan.takeProfit,
          lotSize: plan.lotSize,
          riskReward: plan.riskReward,
          notes: plan.notes,
          status: plan.status ?? 'planned',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.plan) setPlans((prev) => [...prev, data.plan as TradePlan]);
        else throw new Error('Invalid response');
      } else {
        throw new Error('Failed to create plan');
      }
    } catch {
      // fallback locally if offline
      const newLocal: TradePlan = { ...plan, id: `local_${Date.now()}`, createdAt: new Date().toISOString() } as any;
      setPlans((prev) => [...prev, newLocal]);
    }
  };

  const updatePlan = async (id: string, updatedPlan: Partial<TradePlan>) => {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...updatedPlan } : p)));
    try {
      await fetch('/api/trade-plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updatedPlan }),
      });
    } catch {}
  };

  const deletePlan = async (id: string) => {
    setPlans((prev) => prev.filter((plan) => plan.id !== id));
    try { await fetch(`/api/trade-plans?id=${encodeURIComponent(id)}`, { method: 'DELETE' }); } catch {}
  };

  const markExecuted = async (id: string) => {
    await updatePlan(id, { status: "executed" });
  };

  return (
    <TradePlanContext.Provider value={{ plans, addPlan, updatePlan, deletePlan, markExecuted }}>
      {children}
    </TradePlanContext.Provider>
  );
};

// Optional hook
export const useTradePlan = () => {
  const context = useContext(TradePlanContext);
  if (!context) throw new Error("useTradePlan must be used within a TradePlanProvider");
  return context;
};
