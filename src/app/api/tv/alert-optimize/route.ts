import { NextResponse } from "next/server";
import { resolveTvContext, guardTvFeature, buildUsagePayload } from "@/lib/tv/api-helpers";
import { optimizeAlert } from "@/lib/tv/processing";
import { recordTvRun } from "@/lib/tv/usage";

export async function POST(req: Request) {
  const context = await resolveTvContext();
  if (context instanceof NextResponse) return context;

  let payload: { alertText?: string; riskBias?: "conservative" | "balanced" | "aggressive" };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const alertText = payload.alertText?.trim();
  if (!alertText) {
    return NextResponse.json({ error: "alertText is required" }, { status: 400 });
  }

  const limit = await guardTvFeature(context, "alerts");
  if (limit instanceof NextResponse) return limit;

  try {
    const result = await optimizeAlert({ alertText, riskBias: payload.riskBias });
    await recordTvRun(
      context.supabase,
      context.userId,
      "alerts",
      context.plan,
      { alertText, riskBias: payload.riskBias ?? "balanced" } as Record<string, unknown>,
      result as unknown as Record<string, unknown>,
      { source: "api/tv/alert-optimize" }
    );

    const usage = limit.usage + 1;
    return NextResponse.json({
      success: true,
      result,
      usage: buildUsagePayload("alerts", usage, context.plan, limit.limit, limit.unlimited),
    });
  } catch (error) {
    console.error("alert-optimize error", error);
    return NextResponse.json({ error: "Failed to optimize alert" }, { status: 500 });
  }
}