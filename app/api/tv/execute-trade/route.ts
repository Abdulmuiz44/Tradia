import { NextResponse } from "next/server";
import { resolveTvContext, guardTvFeature, buildUsagePayload } from "@/lib/tv/api-helpers";
import { executeTradeSignal } from "@/lib/tv/processing";
import { recordTvRun } from "@/lib/tv/usage";

interface ExecutePayload {
  symbol?: string;
  direction?: "buy" | "sell";
  size?: number;
  stop?: number;
  target?: number;
  mode?: "paper" | "live";
  notes?: string;
}

export async function POST(req: Request) {
  const context = await resolveTvContext();
  if (context instanceof NextResponse) return context;

  let payload: ExecutePayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const limit = await guardTvFeature(context, "broker");
  if (limit instanceof NextResponse) return limit;

  try {
    const result = executeTradeSignal(
      {
        symbol: payload.symbol ?? "",
        direction: payload.direction ?? "buy",
        size: Number(payload.size ?? 0),
        stop: payload.stop,
        target: payload.target,
        mode: payload.mode ?? "paper",
        notes: payload.notes,
      },
      { mt5Frozen: process.env.FREEZE_MT5_INTEGRATION === "1" }
    );

    await recordTvRun(
      context.supabase,
      context.userId,
      "broker",
      context.plan,
      { symbol: payload.symbol, mode: payload.mode ?? "paper" } as Record<string, unknown>,
      result as unknown as Record<string, unknown>,
      { source: "api/tv/execute-trade" }
    );

    const usage = limit.usage + 1;
    return NextResponse.json({
      success: result.accepted,
      result,
      usage: buildUsagePayload("broker", usage, context.plan, limit.limit, limit.unlimited),
    });
  } catch (error) {
    console.error("execute-trade error", error);
    return NextResponse.json({ error: "Failed to route trade" }, { status: 500 });
  }
}
