import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import { fetchAndSyncAccountInfo } from "@/lib/mtapi";

export async function GET() {
  if (process.env.FREEZE_MT5_INTEGRATION === '1') {
    return NextResponse.json({ error: 'MT5 integration temporarily disabled' }, { status: 503 });
  }
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createClient();
    const { data: accounts, error } = await supabase
      .from("mt5_accounts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ accounts: accounts || [] });
  } catch (err) {
    console.error("Get accounts error:", err);
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (process.env.FREEZE_MT5_INTEGRATION === '1') {
    return NextResponse.json({ error: 'MT5 integration temporarily disabled' }, { status: 503 });
  }
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, server, login, password, name } = body;

    if (!server || !login || !password) {
      return NextResponse.json({ error: "Server, login, and password required" }, { status: 400 });
    }

    // Fetch latest account info before saving
    const { account_info } = await fetchAndSyncAccountInfo(userId, { server, login, password });

    const supabase = createClient();
    const { data, error } = await supabase
      .from("mt5_accounts")
      .upsert({
        id,
        user_id: userId,
        server,
        login,
        password, // TODO: encrypt in prod
        name: name || `MT5 ${login}`,
        state: "connected",
        account_info,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,login,server" })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ account: data });
  } catch (err) {
    console.error("Create account error:", err);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
