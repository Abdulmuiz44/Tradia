import { NextResponse } from "next/server";
import { resolveTvContext, guardTvFeature, buildUsagePayload } from "@/lib/tv/api-helpers";
import { parseCsvToRows, buildPortfolioInsights } from "@/lib/tv/processing";
import { recordTvRun } from "@/lib/tv/usage";

interface ImportPayload {
  mode?: "portfolio" | "trades";
  csvText?: string;
  entries?: Array<{ timestamp: string | number; pnl: number }>;
}

export async function POST(req: Request) {
  const context = await resolveTvContext();
  if (context instanceof NextResponse) return context;

  let payload: ImportPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const mode = payload.mode ?? "portfolio";
  const limit = await guardTvFeature(context, mode === "portfolio" ? "portfolio" : "backtest");
  if (limit instanceof NextResponse) return limit;

  try {
    type DataRow = { timestamp: number; pnl: number };
    let rows: DataRow[] = [];
    if (payload.entries && Array.isArray(payload.entries)) {
      rows = payload.entries
        .map((entry) => ({
          timestamp: typeof entry.timestamp === "number" ? entry.timestamp : Date.parse(entry.timestamp),
          pnl: Number(entry.pnl),
        }))
        .filter((row) => Number.isFinite(row.timestamp) && Number.isFinite(row.pnl));
    } else if (payload.csvText) {
      rows = parseCsvToRows(payload.csvText);
    }

    if (!rows.length) {
      return NextResponse.json({ error: "No valid data provided" }, { status: 422 });
    }

    const insight = buildPortfolioInsights(rows.slice(0, 5000));

    await recordTvRun(
      context.supabase,
      context.userId,
      "portfolio",
      context.plan,
      { rows: rows.length } as Record<string, unknown>,
      insight as unknown as Record<string, unknown>,
      { source: "api/tv/import", mode }
    );

    const usage = limit.usage + 1;
    return NextResponse.json({
      success: true,
      insight,
      usage: buildUsagePayload("portfolio", usage, context.plan, limit.limit, limit.unlimited),
    });
  } catch (error) {
    console.error("tv-import error", error);
    return NextResponse.json({ error: "Failed to process TradingView import" }, { status: 500 });
  }
}
