// src/app/api/mt5/orders/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { server, login, password } = body;

    if (!server || !login || !password) {
      return NextResponse.json(
        { error: "Server, login, and password are required" },
        { status: 400 }
      );
    }

    // --- Step 1: Fetch orders from mtapi.io ---
    const mtapiUrl = "https://mtapi.io/v1/orders";
    const mt5Response = await fetch(mtapiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ server, login, password }),
    });

    const mt5Data = await mt5Response.json();
    if (!mt5Response.ok) {
      return NextResponse.json(
        {
          error: mt5Data.error || "FETCH_FAILED",
          message: mt5Data.message || "Failed to fetch orders",
        },
        { status: mt5Response.status }
      );
    }

    // --- Step 2: Refresh account info ---
    let accountInfo: any = {};
    try {
      const infoRes = await fetch("https://mtapi.io/v1/account_info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ server, login, password }),
      });
      const infoData = await infoRes.json();
      if (infoRes.ok) accountInfo = infoData.account_info || {};
    } catch (err) {
      console.error("Failed to refresh account info:", err);
    }

    // --- Step 3: Update DB with latest account info ---
    const supabase = createClient();
    await supabase
      .from("mt5_accounts")
      .update({
        account_info: accountInfo,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("server", server)
      .eq("login", login);

    return NextResponse.json({
      orders: mt5Data.orders || [],
      accountInfo,
    });
  } catch (err) {
    console.error("Orders API error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch orders";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
