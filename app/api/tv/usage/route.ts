import { NextResponse } from "next/server";
import { resolveTvContext } from "@/lib/tv/api-helpers";
import { getUsageForFeature } from "@/lib/tv/usage";
import { getTvLimitForPlan, type TvFeatureKey, getMonthlyRemaining } from "@/lib/tv/limits";

const FEATURES: TvFeatureKey[] = [
  "alerts",
  "backtest",
  "portfolio",
  "patterns",
  "screener",
  "broker",
];

export async function GET() {
  const context = await resolveTvContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId, plan } = context;

  const payload = await Promise.all(
    FEATURES.map(async (feature) => {
      const usage = await getUsageForFeature(supabase, userId, feature);
      const info = getTvLimitForPlan(plan, feature);
      const { remaining, unlimited } = getMonthlyRemaining(plan, feature, usage);
      return {
        feature,
        usage,
        limit: info.unlimited ? -1 : info.limit,
        remaining: unlimited ? -1 : remaining,
        unlimited,
      };
    })
  );

  return NextResponse.json({
    plan,
    usage: payload,
    timestamp: new Date().toISOString(),
  });
}
