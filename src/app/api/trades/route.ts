// src/app/api/trades/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";

/**
 * GET /api/trades
 * Fetch user's trades from database
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();

    // Parse query parameters
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const symbol = url.searchParams.get('symbol');
    const outcome = url.searchParams.get('outcome');
    const fromDate = url.searchParams.get('fromDate');
    const toDate = url.searchParams.get('toDate');

    // Build query
    let query = supabase
      .from("trades")
      .select("*")
      .eq("user_id", userId)
      .order("open_time", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (symbol) {
      query = query.ilike("symbol", `%${symbol}%`);
    }

    if (outcome) {
      query = query.eq("outcome", outcome);
    }

    if (fromDate) {
      query = query.gte("open_time", fromDate);
    }

    if (toDate) {
      const toDateEnd = new Date(toDate);
      toDateEnd.setHours(23, 59, 59, 999);
      query = query.lte("open_time", toDateEnd.toISOString());
    }

    const { data: trades, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      trades: trades || [],
      total: count || 0,
      limit,
      offset
    });
  } catch (err: unknown) {
    console.error("Failed to fetch trades:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message || "Failed to fetch trades" }, { status: 500 });
  }
}

/**
 * POST /api/trades
 * Create a new trade manually
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tradeData = await req.json();
    const supabase = createClient();

    // Generate trade ID
    const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Normalize and validate trade data
    const normalizedTrade = {
      id: tradeId,
      user_id: userId,
      ...tradeData,
      symbol: String(tradeData.symbol || "").toUpperCase(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      source: "manual"
    };

    const { data, error } = await supabase
      .from("trades")
      .insert(normalizedTrade)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ trade: data });
  } catch (err: unknown) {
    console.error("Failed to create trade:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message || "Failed to create trade" }, { status: 500 });
  }
}
