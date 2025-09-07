// src/app/api/mt5/sync/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import { fetchAccountInfo } from "@/lib/mtapi";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();

    // Get all MT5 accounts for this user
    const { data: accounts, error } = await supabase
      .from("mt5_accounts")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;

    if (!accounts || accounts.length === 0) {
      return NextResponse.json(
        { message: "No MT5 accounts found for this user" },
        { status: 200 }
      );
    }

    // Refresh each account’s info from mtapi.io
    const refreshed = [];
    for (const acc of accounts) {
      try {
        const accountInfo = await fetchAccountInfo(acc);
        refreshed.push({ id: acc.id, accountInfo });
      } catch (err) {
        console.error(`Failed to refresh account ${acc.login}@${acc.server}`, err);
      }
    }

    return NextResponse.json({
      message: "Accounts synced successfully",
      refreshed,
    });
  } catch (err) {
    console.error("MT5 sync error:", err);
    const message = err instanceof Error ? err.message : "Failed to sync accounts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
