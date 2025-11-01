// src/app/api/trades/select/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import { mergeTradeSecret } from "@/lib/secure-store";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tradeIds } = await req.json();

    if (!Array.isArray(tradeIds)) {
      return NextResponse.json({ error: "tradeIds must be an array" }, { status: 400 });
    }

    const supabase = createClient();

    // Fetch the selected trades
    const { data: trades, error } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", userId)
      .in("id", tradeIds);

    if (error) throw error;

    const decryptedTrades = (trades || []).map((row: any) => mergeTradeSecret(userId!, row));

    return NextResponse.json({ trades: decryptedTrades });
  } catch (err: unknown) {
    console.error("Failed to select trades:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message || "Failed to select trades" }, { status: 500 });
  }
}
