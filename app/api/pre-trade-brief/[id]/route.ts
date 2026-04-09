import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import type { ChecklistStateMap, EditablePreTradeBriefStatus } from "@/types/preTradeBrief";

export const dynamic = "force-dynamic";

const EDITABLE_STATUSES: EditablePreTradeBriefStatus[] = [
  "draft",
  "ready",
  "invalidated",
  "executed",
  "skipped",
];

const isChecklistStateMap = (value: unknown): value is ChecklistStateMap => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  return Object.entries(value).every(([k, v]) => {
    if (!k.trim()) return false;
    if (!v || typeof v !== "object" || Array.isArray(v)) return false;
    const state = v as { completed?: unknown; completedAt?: unknown };
    if (typeof state.completed !== "boolean") return false;
    if (state.completedAt !== undefined && typeof state.completedAt !== "string") return false;
    return true;
  });
};

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from("pre_trade_briefs")
      .select(`
        id,
        user_id,
        forex_pair_id,
        pair_symbol_snapshot,
        timeframe,
        market_session,
        directional_bias_input,
        setup_notes,
        planned_entry,
        planned_stop_loss,
        planned_take_profit,
        risk_reward_ratio,
        ai_summary,
        ai_bias,
        ai_confluence,
        ai_risks,
        ai_invalidators,
        ai_checklist,
        raw_ai_response,
        status,
        trader_notes,
        checklist_state,
        last_reviewed_at,
        created_at,
        updated_at
      `)
      .eq("id", params.id)
      .eq("user_id", session.user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Brief not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/pre-trade-brief/[id] failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const updatePayload: {
      status?: EditablePreTradeBriefStatus;
      trader_notes?: string | null;
      checklist_state?: ChecklistStateMap | null;
      last_reviewed_at?: string | null;
    } = {};

    if (body.status !== undefined) {
      const status = String(body.status || "").trim().toLowerCase() as EditablePreTradeBriefStatus;
      if (!EDITABLE_STATUSES.includes(status)) {
        return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
      }
      updatePayload.status = status;
    }

    if (body.trader_notes !== undefined) {
      if (body.trader_notes === null || body.trader_notes === "") {
        updatePayload.trader_notes = null;
      } else {
        updatePayload.trader_notes = String(body.trader_notes).slice(0, 5000);
      }
    }

    if (body.checklist_state !== undefined) {
      if (body.checklist_state === null) {
        updatePayload.checklist_state = null;
      } else if (!isChecklistStateMap(body.checklist_state)) {
        return NextResponse.json({ error: "Invalid checklist_state payload" }, { status: 400 });
      } else {
        updatePayload.checklist_state = body.checklist_state;
      }
    }

    if (body.last_reviewed_at !== undefined) {
      if (body.last_reviewed_at === null || body.last_reviewed_at === "") {
        updatePayload.last_reviewed_at = null;
      } else {
        const candidate = new Date(body.last_reviewed_at);
        if (Number.isNaN(candidate.getTime())) {
          return NextResponse.json({ error: "Invalid last_reviewed_at value" }, { status: 400 });
        }
        updatePayload.last_reviewed_at = candidate.toISOString();
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "No supported fields provided" }, { status: 400 });
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from("pre_trade_briefs")
      .update(updatePayload)
      .eq("id", params.id)
      .eq("user_id", session.user.id)
      .select(`
        id,
        pair_symbol_snapshot,
        timeframe,
        market_session,
        directional_bias_input,
        setup_notes,
        planned_entry,
        planned_stop_loss,
        planned_take_profit,
        risk_reward_ratio,
        ai_summary,
        ai_bias,
        ai_confluence,
        ai_risks,
        ai_invalidators,
        ai_checklist,
        status,
        trader_notes,
        checklist_state,
        last_reviewed_at,
        created_at,
        updated_at
      `)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Brief not found or update failed" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("PATCH /api/pre-trade-brief/[id] failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
