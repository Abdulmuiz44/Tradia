// src/app/api/mt5/import/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { pool } from "@/lib/db";

type ReqBody = {
  account: { login: number | string; server: string; info?: any };
  trades: any[]; // array of deals returned by mt5 backend
};

export async function POST(req: Request) {
  try {
    // ensure user is signed in
    const session = await getServerSession(authOptions as any);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // find user id
    const ures = await pool.query("SELECT id FROM users WHERE email=$1 LIMIT 1", [userEmail]);
    const user = ures.rows[0];
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const userId = user.id;

    const body = (await req.json()) as ReqBody;
    const { account, trades } = body;
    if (!account || !trades || !Array.isArray(trades)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const login = String(account.login);
    const server = String(account.server || "unknown");

    // Upsert mt5_accounts (add or update)
    const metaapiAccountId = null; // not used here, but keep column consistent if you have it
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
        account.info?.name || `MT5 ${login}`,
        account.info?.currency || null,
        account.info?.balance ?? null,
        "connected",
      ]
    );

    // Insert / upsert trades.
    // Make sure you have created a UNIQUE index on trades(deal_id) or adapt column used for uniqueness.
    let imported = 0;
    for (const d of trades) {
      // adapt fields to your trades table columns
      const deal_id = d.id ?? d.deal_id ?? d.ticket ?? null;
      const order_id = d.orderId ?? d.order_id ?? null;
      const symbol = d.symbol ?? null;
      const type = d.type ?? null;
      const volume = d.volume ?? d.lots ?? d.size ?? null;
      const close_price = d.price ?? d.close_price ?? d.close ?? null;
      const profit = d.profit ?? d.pnl ?? null;
      const commission = d.commission ?? null;
      const swap = d.swap ?? null;
      const comment = d.comment ?? d.client_comment ?? null;
      const time = d.time ?? d.close_time ?? null;

      await pool.query(
        `INSERT INTO trades (
            user_id, metaapi_account_id, deal_id, order_id, symbol, type, volume,
            close_price, profit, commission, swap, comment, close_time, created_at, updated_at
         ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,
            $8,$9,$10,$11,$12,$13,NOW(),NOW()
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
          metaapiAccountId,
          deal_id,
          order_id,
          symbol,
          type,
          volume,
          close_price,
          profit,
          commission,
          swap,
          comment,
          time ? new Date(time) : null,
        ]
      );

      imported++;
    }

    return NextResponse.json({ success: true, imported });
  } catch (err: any) {
    console.error("MT5 import error:", err);
    return NextResponse.json({ error: err?.message || "Import failed" }, { status: 500 });
  }
}
