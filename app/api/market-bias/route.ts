import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import { generateMarketBias } from "@/lib/forex/marketBiasService";
import type { MarketBiasInput } from "@/types/marketBias";

export const dynamic = "force-dynamic";

const VALID_TIMEFRAMES = ["M5", "M15", "M30", "H1", "H4", "D1"] as const;

const normalizeTimeframeSet = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  const normalized = value
    .map((item) => String(item ?? "").trim().toUpperCase())
    .filter((item) => VALID_TIMEFRAMES.includes(item as (typeof VALID_TIMEFRAMES)[number]));

  return Array.from(new Set(normalized)).slice(0, 6);
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pairFilter = request.nextUrl.searchParams.get("pairSymbol")?.trim().toUpperCase();
    const supabase = createClient();

    let query = supabase
      .from("market_bias_reports")
      .select(
        "id, pair_symbol_snapshot, timeframe_set, bias_direction, confidence_score, key_levels, assumptions, invalidation_conditions, alternate_scenario, confidence_rationale, ai_model, prompt_version, generation_latency_ms, source, created_at"
      )
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (pairFilter) {
      query = query.eq("pair_symbol_snapshot", pairFilter);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reports: data || [] });
  } catch (error) {
    console.error("GET /api/market-bias failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const pairSymbol = String(body.pairSymbol || "").trim().toUpperCase();
    const timeframeSet = normalizeTimeframeSet(body.timeframeSet);
    const sessionContext = body.sessionContext ? String(body.sessionContext).trim() : "";
    const recentBackdrop = body.recentBackdrop ? String(body.recentBackdrop).trim() : "";

    if (!pairSymbol) {
      return NextResponse.json({ error: "pairSymbol is required" }, { status: 400 });
    }
    if (!timeframeSet.length) {
      return NextResponse.json({ error: "At least one valid timeframe is required" }, { status: 400 });
    }

    const supabase = createClient();

    const { data: pairData, error: pairError } = await supabase
      .from("forex_pairs")
      .select("id, symbol")
      .eq("symbol", pairSymbol)
      .eq("is_active", true)
      .single();

    if (pairError || !pairData) {
      return NextResponse.json({ error: "Selected forex pair is not available" }, { status: 400 });
    }

    const input: MarketBiasInput = {
      pairSymbol,
      timeframeSet,
      sessionContext,
      recentBackdrop,
    };

    const generated = await generateMarketBias(input);

    const { data: created, error: createError } = await supabase
      .from("market_bias_reports")
      .insert([
        {
          user_id: session.user.id,
          forex_pair_id: pairData.id,
          pair_symbol_snapshot: pairData.symbol,
          timeframe_set: timeframeSet,
          bias_direction: generated.biasDirection,
          confidence_score: generated.confidenceScore,
          key_levels: generated.keyLevels,
          assumptions: generated.assumptions,
          invalidation_conditions: generated.invalidationConditions,
          alternate_scenario: generated.alternateScenario,
          confidence_rationale: generated.confidenceRationale,
          ai_model: generated.aiModel,
          prompt_version: generated.promptVersion,
          generation_latency_ms: generated.generationLatencyMs,
          source: "ai",
          raw_ai_response: generated,
        },
      ])
      .select(
        "id, pair_symbol_snapshot, timeframe_set, bias_direction, confidence_score, key_levels, assumptions, invalidation_conditions, alternate_scenario, confidence_rationale, ai_model, prompt_version, generation_latency_ms, source, created_at"
      )
      .single();

    if (createError || !created) {
      return NextResponse.json({ error: createError?.message || "Failed to save market bias report" }, { status: 500 });
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/market-bias failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
