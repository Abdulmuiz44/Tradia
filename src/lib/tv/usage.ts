import type { SupabaseClient } from "@supabase/supabase-js";
import type { TvFeatureKey } from "./limits";

const FEATURE_TABLE = "tv_feature_runs";

export interface TvUsageRecord {
  id: string;
  user_id: string;
  feature: string;
  created_at: string;
  plan: string | null;
  metadata: Record<string, unknown> | null;
}

function monthStart(date = new Date()): string {
  const d = new Date(date);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function getUsageForFeature(
  supabase: SupabaseClient,
  userId: string,
  feature: TvFeatureKey,
  since: Date = new Date()
): Promise<number> {
  const periodStart = monthStart(since);
  const { count, error } = await supabase
    .from(FEATURE_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("feature", feature)
    .gte("created_at", periodStart);

  if (error) {
    console.error("getUsageForFeature error", error);
    return 0;
  }

  return count ?? 0;
}

export async function recordTvRun(
  supabase: SupabaseClient,
  userId: string,
  feature: TvFeatureKey,
  plan: string,
  payload: Record<string, unknown> | null,
  result: Record<string, unknown> | null,
  metadata: Record<string, unknown> = {}
) {
  const insertData = {
    user_id: userId,
    feature,
    plan,
    payload,
    result,
    metadata,
  } as const;

  const { error } = await supabase.from(FEATURE_TABLE).insert(insertData);
  if (error) {
    console.error("recordTvRun error", error);
    throw error;
  }
}
