import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import { calculateRiskReward, generatePreTradeBrief } from "@/lib/forex/preTradeBriefService";
import type { DirectionalBias, MarketSession, PreTradeBriefInput } from "@/types/preTradeBrief";

export const dynamic = "force-dynamic";

const VALID_SESSIONS: MarketSession[] = ["ASIA", "LONDON", "NEW_YORK", "OVERLAP"];
const VALID_BIAS: DirectionalBias[] = ["bullish", "bearish", "neutral"];
const VALID_TIMEFRAMES = ["M5", "M15", "M30", "H1", "H4", "D1"] as const;
const FILTERABLE_STATUSES = [
  "generated",
  "draft",
  "ready",
  "invalidated",
  "executed",
  "skipped",
  "failed",
] as const;

const isValidNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const normalizeOptionalNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const statusFilterRaw = request.nextUrl.searchParams.get("status");
    const statusFilter = statusFilterRaw ? statusFilterRaw.trim().toLowerCase() : "all";

    if (
      statusFilter !== "all" &&
      !FILTERABLE_STATUSES.includes(statusFilter as (typeof FILTERABLE_STATUSES)[number])
    ) {
      return NextResponse.json({ error: "status filter is invalid" }, { status: 400 });
    }

    const supabase = createClient();
    let briefsQuery = supabase
      .from("pre_trade_briefs")
      .select("id, pair_symbol_snapshot, timeframe, market_session, directional_bias_input, status, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (statusFilter !== "all") {
      briefsQuery = briefsQuery.eq("status", statusFilter);
    }

    const [pairsResult, briefsResult] = await Promise.all([
      supabase
        .from("forex_pairs")
        .select("id, symbol, base_currency, quote_currency, category")
        .eq("is_active", true)
        .order("symbol", { ascending: true }),
      briefsQuery,
    ]);

    if (pairsResult.error) {
      return NextResponse.json({ error: pairsResult.error.message }, { status: 500 });
    }

    if (briefsResult.error) {
      return NextResponse.json({ error: briefsResult.error.message }, { status: 500 });
    }

    return NextResponse.json({
      pairs: pairsResult.data || [],
      briefs: briefsResult.data || [],
    });
  } catch (error) {
    console.error("GET pre-trade-brief failed:", error);
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
    const timeframe = String(body.timeframe || "").trim().toUpperCase();
    const marketSession = String(body.marketSession || "").trim().toUpperCase() as MarketSession;
    const directionalBiasInput = String(body.directionalBiasInput || "").trim().toLowerCase() as DirectionalBias;
    const setupNotes = body.setupNotes ? String(body.setupNotes).trim() : "";

    const plannedEntry = normalizeOptionalNumber(body.plannedEntry);
    const plannedStopLoss = normalizeOptionalNumber(body.plannedStopLoss);
    const plannedTakeProfit = normalizeOptionalNumber(body.plannedTakeProfit);

    if (!pairSymbol) {
      return NextResponse.json({ error: "pairSymbol is required" }, { status: 400 });
    }

    if (!timeframe) {
      return NextResponse.json({ error: "timeframe is required" }, { status: 400 });
    }
    if (!VALID_TIMEFRAMES.includes(timeframe as (typeof VALID_TIMEFRAMES)[number])) {
      return NextResponse.json({ error: "timeframe is invalid" }, { status: 400 });
    }

    if (!VALID_SESSIONS.includes(marketSession)) {
      return NextResponse.json({ error: "marketSession is invalid" }, { status: 400 });
    }

    if (!VALID_BIAS.includes(directionalBiasInput)) {
      return NextResponse.json({ error: "directionalBiasInput is invalid" }, { status: 400 });
    }

    const hasAnyPrice = [plannedEntry, plannedStopLoss, plannedTakeProfit].some((v) => v !== null);
    const hasAllPrices = [plannedEntry, plannedStopLoss, plannedTakeProfit].every((v) => isValidNumber(v));

    if (hasAnyPrice && !hasAllPrices) {
      return NextResponse.json(
        { error: "plannedEntry, plannedStopLoss, and plannedTakeProfit must all be provided together" },
        { status: 400 }
      );
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

    const input: PreTradeBriefInput = {
      pairSymbol,
      timeframe,
      marketSession,
      directionalBiasInput,
      setupNotes,
      plannedEntry,
      plannedStopLoss,
      plannedTakeProfit,
    };

    const aiBrief = await generatePreTradeBrief(input);
    const riskRewardRatio = calculateRiskReward(plannedEntry, plannedStopLoss, plannedTakeProfit);

    const insertPayload = {
      user_id: session.user.id,
      forex_pair_id: pairData.id,
      pair_symbol_snapshot: pairData.symbol,
      timeframe,
      market_session: marketSession,
      directional_bias_input: directionalBiasInput,
      setup_notes: setupNotes || null,
      planned_entry: plannedEntry,
      planned_stop_loss: plannedStopLoss,
      planned_take_profit: plannedTakeProfit,
      risk_reward_ratio: riskRewardRatio,
      ai_summary: aiBrief.summary,
      ai_bias: aiBrief.bias,
      ai_confluence: aiBrief.confluence,
      ai_risks: aiBrief.risks,
      ai_invalidators: aiBrief.invalidationSignals,
      ai_checklist: aiBrief.checklist,
      raw_ai_response: aiBrief,
      status: "generated",
    };

    const { data: created, error: createError } = await supabase
      .from("pre_trade_briefs")
      .insert([insertPayload])
      .select("id, pair_symbol_snapshot, timeframe, market_session, directional_bias_input, risk_reward_ratio, ai_summary, ai_bias, ai_confluence, ai_risks, ai_invalidators, ai_checklist, created_at")
      .single();

    if (createError) {
      console.error("Insert pre_trade_briefs failed:", createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST pre-trade-brief failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
