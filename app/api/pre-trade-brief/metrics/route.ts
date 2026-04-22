import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import type { ChecklistStateMap } from "@/types/preTradeBrief";
import type { PreTradeQualityMetrics } from "@/types/preTradeMetrics";

export const dynamic = "force-dynamic";

const DEFAULT_WINDOW_DAYS = 30;
const MIN_WINDOW_DAYS = 7;
const MAX_WINDOW_DAYS = 90;

const toWindowDays = (raw: string | null): number => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_WINDOW_DAYS;
  const rounded = Math.round(parsed);
  return Math.max(MIN_WINDOW_DAYS, Math.min(MAX_WINDOW_DAYS, rounded));
};

const toChecklistState = (value: unknown): ChecklistStateMap => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as ChecklistStateMap;
};

const normalizeAiChecklist = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
};

const isChecklistComplete = (
  aiChecklist: string[],
  checklistState: ChecklistStateMap,
  eventRiskAction: string | null
): boolean => {
  if (!aiChecklist.length) return false;
  const allAiItemsDone = aiChecklist.every((item) => checklistState[item]?.completed === true);
  const eventRiskNeedsAck = eventRiskAction === "wait";
  const eventRiskAcknowledged = checklistState["Event risk acknowledged"]?.completed === true;
  return allAiItemsDone && (!eventRiskNeedsAck || eventRiskAcknowledged);
};

const asPercent = (value: number): number => Math.round(value * 1000) / 10;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const periodDays = toWindowDays(request.nextUrl.searchParams.get("days"));
    const fromDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();
    const supabase = createClient();

    const { data, error } = await supabase
      .from("pre_trade_briefs")
      .select("status, created_at, last_reviewed_at, approval_state, ai_checklist, checklist_state, event_risk_action")
      .eq("user_id", session.user.id)
      .gte("created_at", fromDate);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const briefs = data || [];
    const generated = briefs.length;
    const reviewed = briefs.filter((item) => Boolean(item.last_reviewed_at)).length;
    const activeDays = new Set(
      briefs
        .map((item) => String(item.created_at || "").slice(0, 10))
        .filter(Boolean)
    ).size;

    const checklistCoverage = briefs.filter((item) => normalizeAiChecklist(item.ai_checklist).length > 0).length;
    const checklistComplete = briefs.filter((item) =>
      isChecklistComplete(
        normalizeAiChecklist(item.ai_checklist),
        toChecklistState(item.checklist_state),
        item.event_risk_action ? String(item.event_risk_action) : null
      )
    ).length;

    const executedBriefs = briefs.filter((item) => item.status === "executed");
    const executionDriftCount = executedBriefs.filter((item) => {
      const checklistCompleteForBrief = isChecklistComplete(
        normalizeAiChecklist(item.ai_checklist),
        toChecklistState(item.checklist_state),
        item.event_risk_action ? String(item.event_risk_action) : null
      );

      return item.approval_state === "blocked" || !checklistCompleteForBrief;
    }).length;

    const metrics: PreTradeQualityMetrics = {
      period_days: periodDays,
      generated_briefs: generated,
      reviewed_briefs: reviewed,
      active_days: activeDays,
      adoption_rate: generated > 0 ? asPercent(reviewed / generated) : 0,
      checklist_coverage: checklistCoverage,
      checklist_completion_rate: checklistCoverage > 0 ? asPercent(checklistComplete / checklistCoverage) : 0,
      executed_briefs: executedBriefs.length,
      execution_drift_rate: executedBriefs.length > 0 ? asPercent(executionDriftCount / executedBriefs.length) : 0,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("GET /api/pre-trade-brief/metrics failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
