// src/app/api/mt5/import/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";

type AccountInfo = { login?: number | string; server?: string; info?: Record<string, unknown> | null };
type ReqBody = { account?: AccountInfo; trades?: unknown[] };

function asString(u: unknown): string {
  return typeof u === "string" ? u : u === undefined || u === null ? "" : String(u);
}
function asNumberOrNull(u: unknown): number | null {
  if (typeof u === "number") return Number.isFinite(u) ? u : null;
  if (typeof u === "string") {
    const n = Number(u);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = asString(session?.user?.email);
    if (!userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();
    const { data: user, error: userErr } = await supabase
      .from("users")
      .select("id")
      .eq("email", userEmail)
      .maybeSingle();
    if (userErr) throw userErr;
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const userId = (user as any).id as string;

    const body = (await req.json()) as ReqBody;
    const account = body?.account;
    const trades = Array.isArray(body?.trades) ? body!.trades! : null;
    if (!account || !trades) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const login = asString(account.login ?? "");
    const server = asString(account.server ?? "unknown");
    const info = account.info ?? null;

    // Upsert mt5_accounts via Supabase
    const { error: accErr } = await supabase.from("mt5_accounts").upsert(
      {
        user_id: userId,
        login,
        server,
        name: (info && (asString(info.name) || `MT5 ${login}`)) ?? `MT5 ${login}`,
        currency: info?.currency ? asString(info.currency) : null,
        balance: info?.balance ? asNumberOrNull(info.balance) : null,
        state: "connected",
      },
      { onConflict: ["user_id", "login", "server"] }
    );
    if (accErr) console.error("Failed to upsert mt5 account:", accErr);

    // Insert / upsert trades
    let imported = 0;
    for (const raw of trades) {
      const d = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
      const deal_id = d?.id ?? d?.deal_id ?? d?.ticket ?? null;
      if (!deal_id) continue;
      const order_id = d?.orderId ?? d?.order_id ?? null;
      const symbol = asString(d?.symbol ?? null) || null;
      const type = asString(d?.type ?? null) || null;
      const volume = asNumberOrNull(d?.volume ?? d?.lots ?? d?.size ?? null);
      const close_price = asString(d?.price ?? d?.close_price ?? d?.close ?? null) || null;
      const profit = asNumberOrNull(d?.profit ?? d?.pnl ?? null);
      const commission = asNumberOrNull(d?.commission ?? null);
      const swap = asNumberOrNull(d?.swap ?? null);
      const comment = asString(d?.comment ?? d?.client_comment ?? null) || null;
      const time = d?.time ?? d?.close_time ?? null;
      const closeTime = time ? new Date(asString(time)) : null;

      try {
        const { error: upErr } = await supabase.from("trades").upsert(
          {
            user_id: userId,
            metaapi_account_id: null,
            deal_id: asString(deal_id),
            order_id: asString(order_id ?? null),
            symbol,
            type,
            volume,
            close_price,
            profit,
            commission,
            swap,
            comment,
            close_time: closeTime,
          },
          { onConflict: ["deal_id"] }
        );
        if (upErr) console.error("Failed to insert trade:", upErr, d);
        imported++;
      } catch (err: unknown) {
        console.error("Failed to insert trade:", err, d);
      }
    }

    return NextResponse.json({ success: true, imported });
  } catch (err: unknown) {
    console.error("MT5 import error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || "Import failed" }, { status: 500 });
  }
}
