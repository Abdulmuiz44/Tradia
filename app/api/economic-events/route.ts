import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import type { EventImpact } from "@/types/eventAwareness";

export const dynamic = "force-dynamic";

type EventIngestItem = {
  providerEventId: string;
  title: string;
  country?: string;
  currency: string;
  impact: EventImpact;
  scheduledAt: string;
  actual?: string | null;
  forecast?: string | null;
  previous?: string | null;
  eventType?: string | null;
};

const normalizeImpact = (value: unknown): EventImpact | null => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "low" || normalized === "medium" || normalized === "high") return normalized;
  return null;
};

const normalizeIso = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const isAuthorized = async (request: NextRequest): Promise<boolean> => {
  const bearer = request.headers.get("authorization") || "";
  const token = bearer.startsWith("Bearer ") ? bearer.slice(7).trim() : "";
  const configuredToken = process.env.ECONOMIC_EVENTS_INGEST_TOKEN?.trim();

  if (configuredToken && token && token === configuredToken) {
    return true;
  }

  const session = await getServerSession(authOptions);
  return Boolean(session?.user?.id);
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currency = request.nextUrl.searchParams.get("currency")?.trim().toUpperCase();
    const from = normalizeIso(request.nextUrl.searchParams.get("from")) || new Date().toISOString();
    const to =
      normalizeIso(request.nextUrl.searchParams.get("to")) ||
      new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const supabase = createClient();
    let query = supabase
      .from("economic_events")
      .select("id, provider_event_id, title, country, currency, impact, scheduled_at, actual, forecast, previous, event_type")
      .gte("scheduled_at", from)
      .lte("scheduled_at", to)
      .order("scheduled_at", { ascending: true })
      .limit(100);

    if (currency) {
      query = query.eq("currency", currency);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ events: data || [] });
  } catch (error) {
    console.error("GET /api/economic-events failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const allowed = await isAuthorized(request);
    if (!allowed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const inputItems = Array.isArray((body as { events?: unknown[] }).events)
      ? ((body as { events: unknown[] }).events as unknown[])
      : [];
    if (!inputItems.length) {
      return NextResponse.json({ error: "events[] is required" }, { status: 400 });
    }

    const validRows: EventIngestItem[] = [];
    for (const item of inputItems) {
      const row = item as Partial<EventIngestItem>;
      const providerEventId = String(row.providerEventId || "").trim();
      const title = String(row.title || "").trim();
      const currency = String(row.currency || "").trim().toUpperCase();
      const impact = normalizeImpact(row.impact);
      const scheduledAt = normalizeIso(row.scheduledAt);

      if (!providerEventId || !title || !currency || !impact || !scheduledAt) {
        continue;
      }

      validRows.push({
        providerEventId,
        title,
        country: row.country ? String(row.country).trim() : undefined,
        currency,
        impact,
        scheduledAt,
        actual: row.actual ? String(row.actual) : null,
        forecast: row.forecast ? String(row.forecast) : null,
        previous: row.previous ? String(row.previous) : null,
        eventType: row.eventType ? String(row.eventType) : null,
      });
    }

    if (!validRows.length) {
      return NextResponse.json({ error: "No valid events found in payload" }, { status: 400 });
    }

    const supabase = createClient();
    const payload = validRows.map((row) => ({
      provider_event_id: row.providerEventId,
      title: row.title,
      country: row.country || null,
      currency: row.currency,
      impact: row.impact,
      scheduled_at: row.scheduledAt,
      actual: row.actual || null,
      forecast: row.forecast || null,
      previous: row.previous || null,
      event_type: row.eventType || null,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("economic_events")
      .upsert(payload, { onConflict: "provider_event_id" })
      .select("id, provider_event_id, title, currency, impact, scheduled_at");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        ingested: data?.length || 0,
        events: data || [],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/economic-events failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
