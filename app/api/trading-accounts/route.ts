import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const supabase = createClient();
    const { data, error } = await supabase
      .from("trading_accounts")
      .select("id, name, currency, initial_balance, current_balance, mode, broker, platform, credential_id, is_active, created_at, updated_at")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (error) throw error;

    return NextResponse.json({ accounts: data || [] });
  } catch (err) {
    console.error("trading-accounts GET error:", err);
    return NextResponse.json({ accounts: [] });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const providedName = typeof body?.name === 'string' ? String(body.name).trim() : '';
    const currency = (String(body?.currency || 'USD').toUpperCase()).slice(0, 10);
    const initial_balance = Number(body?.initial_balance ?? body?.balance ?? body?.current_balance ?? NaN);

    if (!Number.isFinite(initial_balance)) {
      return NextResponse.json({ error: "INVALID_INPUT", message: "initial_balance is required (number)" }, { status: 400 });
    }

    const supabase = createClient();
    // Auto-generate a default name if not provided: "Manual Account" or with numeric suffix
    let name = providedName;
    if (!name) {
      const base = 'Manual Account';
      // fetch existing manual names
      const { data: existing } = await supabase
        .from('trading_accounts')
        .select('name')
        .eq('user_id', userId)
        .ilike('name', `${base}%`);
      if (!existing || existing.length === 0) name = base;
      else {
        // find next available suffix
        const used = new Set(existing.map((r: any) => String(r.name)));
        let idx = 2;
        name = base;
        while (used.has(name)) {
          name = `${base} ${idx}`;
          idx++;
        }
      }
    }

    const { data, error } = await supabase
      .from("trading_accounts")
      .insert({
        user_id: userId,
        name,
        currency,
        initial_balance,
        current_balance: initial_balance,
        mode: 'manual',
        platform: 'MT5',
        is_active: true,
      })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ account: data });
  } catch (err) {
    console.error("trading-accounts POST error:", err);
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
