import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import { evaluateEventRisk } from "@/lib/forex/eventAwarenessService";
import type { EconomicEvent } from "@/types/eventAwareness";

export const dynamic = "force-dynamic";

const normalizePlannedAt = (value: string | null): string => {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
};

const mapImpact = (value: unknown): EconomicEvent["impact"] => {
  const candidate = String(value || "").trim().toLowerCase();
  if (candidate === "high" || candidate === "medium" || candidate === "low") return candidate;
  return "medium";
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pairSymbol = String(request.nextUrl.searchParams.get("pairSymbol") || "")
      .trim()
      .toUpperCase();
    if (!pairSymbol) {
      return NextResponse.json({ error: "pairSymbol is required" }, { status: 400 });
    }

    const plannedAt = normalizePlannedAt(request.nextUrl.searchParams.get("plannedAt"));
    const plannedDate = new Date(plannedAt);
    const windowStart = new Date(plannedDate.getTime() - 2 * 60 * 60 * 1000);
    const windowEnd = new Date(plannedDate.getTime() + 6 * 60 * 60 * 1000);

    const supabase = createClient();
    const { data: pairData, error: pairError } = await supabase
      .from("forex_pairs")
      .select("base_currency, quote_currency")
      .eq("symbol", pairSymbol)
      .eq("is_active", true)
      .single();

    if (pairError || !pairData) {
      return NextResponse.json({ error: "Selected forex pair is not available" }, { status: 400 });
    }

    const currencies = [pairData.base_currency, pairData.quote_currency];
    const eventsResult = await supabase
      .from("economic_events")
      .select("id, title, currency, country, impact, scheduled_at")
      .in("currency", currencies)
      .gte("scheduled_at", windowStart.toISOString())
      .lte("scheduled_at", windowEnd.toISOString())
      .order("scheduled_at", { ascending: true });

    // Gracefully fallback if this table is not yet migrated in some envs.
    if (eventsResult.error) {
      const fallback = evaluateEventRisk([], plannedAt, pairSymbol);
      return NextResponse.json({
        plannedAt,
        pairSymbol,
        action: fallback.action,
        summary: fallback.summary,
        windowStart: fallback.windowStart,
        windowEnd: fallback.windowEnd,
        events: [],
      });
    }

    const mappedEvents: EconomicEvent[] = (eventsResult.data || []).map((event) => ({
      id: String(event.id),
      title: String(event.title || "Untitled event"),
      currency: String(event.currency || "").toUpperCase(),
      country: event.country ? String(event.country) : null,
      impact: mapImpact(event.impact),
      scheduled_at: String(event.scheduled_at),
    }));

    const report = evaluateEventRisk(mappedEvents, plannedAt, pairSymbol);

    return NextResponse.json({
      plannedAt,
      pairSymbol,
      action: report.action,
      summary: report.summary,
      windowStart: report.windowStart,
      windowEnd: report.windowEnd,
      events: report.relevantEvents,
    });
  } catch (error) {
    console.error("GET /api/event-awareness failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
