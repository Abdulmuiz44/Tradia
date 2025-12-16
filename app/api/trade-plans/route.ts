// src/app/api/trade-plans/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import { makeSecret, splitTradePlanFields } from "@/lib/secure-store";

export const dynamic = 'force-dynamic';

function toCamel(row: any) {
  const base = {
    id: row.id,
    user_id: row.user_id,
    symbol: row.symbol,
    setupType: row.setup_type || row.setupType,
    plannedEntry: row.planned_entry ?? row.plannedEntry,
    stopLoss: row.stop_loss ?? row.stopLoss,
    takeProfit: row.take_profit ?? row.takeProfit,
    lotSize: row.lot_size ?? row.lotSize,
    riskReward: row.risk_reward ?? row.riskReward,
    status: row.status,
    createdAt: row.created_at,
    updated_at: row.updated_at,
  } as any;
  // merge notes if present in plaintext (legacy) or secret decrypted at client later if needed
  if (row.notes != null) base.notes = row.notes;
  return base;
}

function toSnake(input: any) {
  return {
    symbol: input.symbol,
    setup_type: input.setupType,
    planned_entry: input.plannedEntry,
    stop_loss: input.stopLoss,
    take_profit: input.takeProfit,
    lot_size: input.lotSize,
    risk_reward: input.riskReward,
    status: input.status ?? 'planned',
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createClient();
    const { data, error } = await supabase
      .from("trade_plans")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    // Do not decrypt server-side; client consumes as-is or via other server APIs
    const plans = (data || []).map(toCamel);
    return NextResponse.json({ plans });
  } catch (err: unknown) {
    console.error("Failed to fetch trade plans:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message || "Failed to fetch plans" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { safe, sensitive } = splitTradePlanFields(body);
    const secret = makeSecret(userId, "trade_plan", sensitive);
    const supabase = createClient();

    const insertData = { user_id: userId, ...toSnake(safe), secret, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("trade_plans").insert(insertData).select("*").single();
    if (error) throw error;
    return NextResponse.json({ plan: toCamel(data) });
  } catch (err: unknown) {
    console.error("Failed to create trade plan:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message || "Failed to create plan" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, ...updates } = body || {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { safe, sensitive } = splitTradePlanFields(updates);
    const secret = makeSecret(userId, "trade_plan", sensitive);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("trade_plans")
      .update({ ...toSnake(safe), secret, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ plan: toCamel(data) });
  } catch (err: unknown) {
    console.error("Failed to update trade plan:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message || "Failed to update plan" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const supabase = createClient();
    const { error } = await supabase
      .from("trade_plans")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Failed to delete trade plan:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message || "Failed to delete plan" }, { status: 500 });
  }
}

