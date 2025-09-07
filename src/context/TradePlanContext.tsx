"use client";

import { createContext, useState, useEffect, useContext, ReactNode } from "react";
import { v4 as uuidv4 } from "uuid";
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

  // Load from localStorage on mount
  useEffect(() => {
    const storedPlans = localStorage.getItem("tradePlans");
    if (storedPlans) setPlans(JSON.parse(storedPlans));
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem("tradePlans", JSON.stringify(plans));
  }, [plans]);

  const addPlan = (plan: Omit<TradePlan, "id" | "createdAt">) => {
    const newPlan: TradePlan = {
      ...plan,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    setPlans((prev) => [...prev, newPlan]);
  };

  const updatePlan = (id: string, updatedPlan: Partial<TradePlan>) => {
    setPlans((prev) =>
      prev.map((plan) => (plan.id === id ? { ...plan, ...updatedPlan } : plan))
    );
  };

  const deletePlan = (id: string) => {
    setPlans((prev) => prev.filter((plan) => plan.id !== id));
  };

  const markExecuted = (id: string) => {
    updatePlan(id, { status: "executed" });
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
