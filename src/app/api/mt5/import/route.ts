// src/app/api/mt5/import/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { pool } from "@/lib/db";

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

    const ures = await pool.query<{ id: string }>("SELECT id FROM users WHERE email=$1 LIMIT 1", [userEmail]);
    const user = ures.rows[0];
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const userId = user.id;

    const body = (await req.json()) as ReqBody;
    const account = body?.account;
    const trades = Array.isArray(body?.trades) ? body!.trades! : null;
    if (!account || !trades) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const login = asString(account.login ?? "");
    const server = asString(account.server ?? "unknown");
    const info = account.info ?? null;

    // Upsert mt5_accounts
    await pool.query(
      `INSERT INTO mt5_accounts (user_id, login, server, name, currency, balance, state, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
       ON CONFLICT (user_id, login, server) DO UPDATE
         SET name = EXCLUDED.name,
             currency = COALESCE(EXCLUDED.currency, mt5_accounts.currency),
             balance = EXCLUDED.balance,
             state = EXCLUDED.state,
             updated_at = NOW()`,
      [
        userId,
        login,
        server,
        (info && (asString(info.name) || `MT5 ${login}`)) ?? `MT5 ${login}`,
        info?.currency ? asString(info.currency) : null,
        info?.balance ? asNumberOrNull(info.balance) : null,
        "connected",
      ] as (string | number | null)[]
    );

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
        await pool.query(
          `INSERT INTO trades (
              user_id, metaapi_account_id, deal_id, order_id, symbol, type, volume,
              close_price, profit, commission, swap, comment, close_time, created_at, updated_at
           ) VALUES (
              $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW()
           )
           ON CONFLICT (deal_id) DO UPDATE
             SET profit = EXCLUDED.profit,
                 commission = EXCLUDED.commission,
                 swap = EXCLUDED.swap,
                 close_price = EXCLUDED.close_price,
                 comment = EXCLUDED.comment,
                 close_time = EXCLUDED.close_time,
                 updated_at = NOW()`,
          [
            userId,
            null,
            asString(deal_id),
            asString(order_id ?? null),
            symbol,
            type,
            volume,
            close_price,
            profit,
            commission,
            swap,
            comment,
            closeTime,
          ] as (string | number | null | Date)[]
        );
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
