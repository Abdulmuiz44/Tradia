import { PLAN_LIMITS, PlanType } from "@/lib/planAccess";

export type TvFeatureKey =
  | "alerts"
  | "backtest"
  | "portfolio"
  | "patterns"
  | "screener"
  | "broker";

const FEATURE_TO_LIMIT: Record<TvFeatureKey, keyof typeof PLAN_LIMITS.free> = {
  alerts: "tvAlerts",
  backtest: "tvBacktests",
  portfolio: "tvBacktests",
  patterns: "tvPatterns",
  screener: "tvScreener",
  broker: "tvBroker",
};

export interface TvPlanLimit {
  limit: number;
  unlimited: boolean;
  enabled: boolean;
}

function normalizePlan(plan: PlanType | string | null | undefined): PlanType {
  if (!plan) return "free";
  const lower = String(plan).toLowerCase();
  if (["free", "pro", "plus", "elite"].includes(lower)) {
    return lower as PlanType;
  }
  if (lower === "premium") return "plus";
  if (lower === "starter") return "free";
  return "free";
}

export function getTvLimitForPlan(
  plan: PlanType | string | null | undefined,
  feature: TvFeatureKey
): TvPlanLimit {
  const planKey = normalizePlan(plan as PlanType);
  const limitKey = FEATURE_TO_LIMIT[feature];
  const value = PLAN_LIMITS[planKey][limitKey as keyof typeof PLAN_LIMITS.free];

  if (typeof value === "boolean") {
    return {
      limit: value ? -1 : 0,
      unlimited: value,
      enabled: value,
    };
  }

  if (typeof value === "number") {
    return {
      limit: value,
      unlimited: value === -1,
      enabled: value === -1 ? true : value > 0,
    };
  }

  return {
    limit: 0,
    unlimited: false,
    enabled: false,
  };
}

export function requiresUpgrade(plan: PlanType | string | null | undefined, feature: TvFeatureKey): boolean {
  const { enabled } = getTvLimitForPlan(plan, feature);
  return !enabled;
}

export function getMonthlyRemaining(
  plan: PlanType | string | undefined,
  feature: TvFeatureKey,
  usedThisPeriod: number
): { remaining: number; unlimited: boolean } {
  const info = getTvLimitForPlan(plan, feature);
  if (!info.enabled) return { remaining: 0, unlimited: false };
  if (info.unlimited) return { remaining: Number.POSITIVE_INFINITY, unlimited: true };
  const remaining = Math.max(0, info.limit - usedThisPeriod);
  return { remaining, unlimited: false };
}

export function getTvFeatureLabel(feature: TvFeatureKey): string {
  switch (feature) {
    case "alerts":
      return "AI Alert Builder";
    case "backtest":
      return "Backtest Simulator";
    case "portfolio":
      return "Portfolio Hub";
    case "patterns":
      return "Pattern Scanner";
    case "screener":
      return "Screener Bridge";
    case "broker":
      return "Trade Executor";
    default:
      return feature;
  }
}
