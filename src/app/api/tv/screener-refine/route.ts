import { NextResponse } from "next/server";
import { resolveTvContext, guardTvFeature, buildUsagePayload } from "@/lib/tv/api-helpers";
import { refineScreener } from "@/lib/tv/processing";
import { recordTvRun } from "@/lib/tv/usage";

export async function POST(req: Request) {
  const context = await resolveTvContext();
  if (context instanceof NextResponse) return context;

  let payload: { screener?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = payload.screener?.trim();
  if (!text) {
    return NextResponse.json({ error: "screener text required" }, { status: 400 });
  }

  const limit = await guardTvFeature(context, "screener");
  if (limit instanceof NextResponse) return limit;

  try {
    const rows = refineScreener(text);

    await recordTvRun(
      context.supabase,
      context.userId,
      "screener",
      context.plan,
      { rows: rows.length } as Record<string, unknown>,
      { rows } as Record<string, unknown>,
      { source: "api/tv/screener-refine" }
    );

    const usage = limit.usage + 1;
    return NextResponse.json({
      success: true,
      rows,
      usage: buildUsagePayload("screener", usage, context.plan, limit.limit, limit.unlimited),
    });
  } catch (error) {
    console.error("screener-refine error", error);
    return NextResponse.json({ error: "Failed to refine screener" }, { status: 500 });
  }
}
