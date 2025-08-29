// src/app/api/mt5/accounts/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();

    // Get user's MT5 accounts
    const { data: accounts, error } = await supabase
      .from("mt5_accounts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ accounts: accounts || [] });
  } catch (err) {
    console.error("Failed to get MT5 accounts:", err);
    const message = err instanceof Error ? err.message : "Failed to get accounts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, server, login, password, name, accountInfo, state } = body;

    if (!server || !login || !password) {
      return NextResponse.json(
        { error: "Server, login, and password are required" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Store MT5 account (in production, encrypt the password)
    const { data, error } = await supabase
      .from("mt5_accounts")
      .upsert({
        id,
        user_id: userId,
        server,
        login,
        password, // TODO: Encrypt this in production
        name: name || `MT5 ${login}`,
        state: state || "connected",
        account_info: accountInfo || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id,login,server" })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ account: data });
  } catch (err) {
    console.error("Failed to create MT5 account:", err);
    const message = err instanceof Error ? err.message : "Failed to create account";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}