import { NextResponse } from "next/server";
import { resolveTvContext, guardTvFeature, buildUsagePayload } from "@/lib/tv/api-helpers";
import { scanPatterns } from "@/lib/tv/processing";
import { recordTvRun } from "@/lib/tv/usage";

interface PatternPayload {
  symbol?: string;
  timeframe?: string;
  dataPoints?: number[];
}

export async function POST(req: Request) {
  const context = await resolveTvContext();
  if (context instanceof NextResponse) return context;

  let payload: PatternPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.dataPoints || !Array.isArray(payload.dataPoints)) {
    return NextResponse.json({ error: "dataPoints array required" }, { status: 400 });
  }

  const limit = await guardTvFeature(context, "patterns");
  if (limit instanceof NextResponse) return limit;

  try {
    const detections = scanPatterns({
      symbol: payload.symbol ?? "UNKNOWN",
      timeframe: payload.timeframe ?? "1h",
      dataPoints: payload.dataPoints.slice(0, 5000),
    });

    await recordTvRun(
      context.supabase,
      context.userId,
      "patterns",
      context.plan,
      { symbol: payload.symbol, timeframe: payload.timeframe } as Record<string, unknown>,
      { detections } as Record<string, unknown>,
      { source: "api/tv/pattern-scan" }
    );

    const usage = limit.usage + 1;
    return NextResponse.json({
      success: true,
      detections,
      usage: buildUsagePayload("patterns", usage, context.plan, limit.limit, limit.unlimited),
    });
  } catch (error) {
    console.error("pattern-scan error", error);
    return NextResponse.json({ error: "Failed to scan patterns" }, { status: 500 });
  }
}
