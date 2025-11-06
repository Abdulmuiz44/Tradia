import { NextResponse } from "next/server";
import { resolveTvContext, guardTvFeature, buildUsagePayload } from "@/lib/tv/api-helpers";
import { parseCsvToRows, simulateBacktest } from "@/lib/tv/processing";
import { recordTvRun } from "@/lib/tv/usage";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const context = await resolveTvContext();
  if (context instanceof NextResponse) return context;

  const limit = await guardTvFeature(context, "backtest");
  if (limit instanceof NextResponse) return limit;

  let csvText = "";
  try {
    const form = await req.formData();
    const file = form.get("csvFile");
    if (file instanceof File) {
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "File too large" }, { status: 400 });
      }
      csvText = await file.text();
    } else {
      const raw = form.get("csvText") || form.get("csv");
      if (typeof raw === "string") {
        csvText = raw;
      }
    }
  } catch (error) {
    console.error("backtest-sim form error", error);
    return NextResponse.json({ error: "Invalid form payload" }, { status: 400 });
  }

  if (!csvText.trim()) {
    return NextResponse.json({ error: "CSV data required" }, { status: 400 });
  }

  try {
    const rows = parseCsvToRows(csvText).slice(0, 5000);
    if (!rows.length) {
      return NextResponse.json({ error: "Unable to parse CSV" }, { status: 422 });
    }

    const sim = simulateBacktest(rows);

    await recordTvRun(
      context.supabase,
      context.userId,
      "backtest",
      context.plan,
      { rows: rows.length } as Record<string, unknown>,
      sim as unknown as Record<string, unknown>,
      { source: "api/tv/backtest-sim" }
    );

    const usage = limit.usage + 1;
    return NextResponse.json({
      success: true,
      result: sim,
      usage: buildUsagePayload("backtest", usage, context.plan, limit.limit, limit.unlimited),
    });
  } catch (error) {
    console.error("backtest-sim error", error);
    return NextResponse.json({ error: "Failed to simulate backtest" }, { status: 500 });
  }
}
