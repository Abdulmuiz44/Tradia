import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import { resolvePlanTypeForUser, normalizePlanType, type PlanType } from "@/lib/planAccess";
import { getTvLimitForPlan, type TvFeatureKey, getMonthlyRemaining } from "./limits";
import { getUsageForFeature } from "./usage";

export interface TvRequestContext {
  userId: string;
  plan: PlanType;
  supabase: ReturnType<typeof createClient>;
  session: Awaited<ReturnType<typeof getServerSession>>;
}

export async function resolveTvContext(): Promise<TvRequestContext | NextResponse> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient();
  const plan = await resolvePlanTypeForUser(supabase, userId);
  return { userId, plan, supabase, session };
}

export async function guardTvFeature(
  ctx: TvRequestContext,
  feature: TvFeatureKey
): Promise<{ usage: number; limit: number; unlimited: boolean } | NextResponse> {
  const tvLimit = getTvLimitForPlan(ctx.plan, feature);
  if (!tvLimit.enabled) {
    return NextResponse.json({
      error: "UPGRADE_REQUIRED",
      detail: `${feature} not available on current plan`,
      plan: ctx.plan,
    }, { status: 403 });
  }

  const usage = await getUsageForFeature(ctx.supabase, ctx.userId, feature);
  if (!tvLimit.unlimited && usage >= tvLimit.limit) {
    return NextResponse.json({
      error: "LIMIT_REACHED",
      limit: tvLimit.limit,
      used: usage,
      plan: ctx.plan,
    }, { status: 429 });
  }

  const { remaining, unlimited } = getMonthlyRemaining(ctx.plan, feature, usage);
  return {
    usage,
    limit: unlimited ? -1 : remaining + usage,
    unlimited,
  };
}

export function buildUsagePayload(
  feature: TvFeatureKey,
  usage: number,
  plan: PlanType,
  limit: number,
  unlimited: boolean
) {
  return {
    feature,
    usage,
    limit,
    unlimited,
    plan,
  };
}

export function parsePlanFromSession(session: any): PlanType {
  const plan = session?.user?.plan ?? session?.plan;
  return normalizePlanType(plan);
}
