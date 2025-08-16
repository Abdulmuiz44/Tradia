// src/app/api/mt5/connect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { pool } from "@/lib/db";

type Body = {
  login: string;
  password: string;
  server: string;
  from?: string;
  to?: string;
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // get user id
    const ures = await pool.query("SELECT id FROM users WHERE email=$1 LIMIT 1", [userEmail]);
    const userRow = ures.rows[0];
    if (!userRow) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const userId = userRow.id;

    const body = await req.json() as Body;
    const { login, password, server, from, to } = body;
    if (!login || !password || !server) {
      return NextResponse.json({ error: "login, password and server are required" }, { status: 400 });
    }

    // CALL Flask backend
    const flaskRes = await fetch("http://127.0.0.1:5000/sync_mt5", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password, server, from, to }),
    });

    if (!flaskRes.ok) {
      const text = await flaskRes.text();
      return NextResponse.json({ error: `Sync service error: ${flaskRes.status} ${text}` }, { status: 502 });
    }

    const data = await flaskRes.json();
    if (!data.success) {
      return NextResponse.json({ error: data.error || "Sync failed" }, { status: 500 });
    }

    const account = data.account ?? null;
    const deals = Array.isArray(data.deals) ? data.deals : [];

    // Upsert mt5_accounts entry for this user/login/server
    const accRes = await pool.query(
      `INSERT INTO mt5_accounts (user_id, login, server, name, currency, balance, state, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
       ON CONFLICT (user_id, login, server) DO UPDATE
         SET name = EXCLUDED.name,
             currency = EXCLUDED.currency,
             balance = EXCLUDED.balance,
             state = EXCLUDED.state,
             updated_at = NOW()
       RETURNING id`,
      [
        userId,
        Number(login),
        server,
        account?.name ?? `Account ${login}`,
        account?.currency ?? null,
        account?.balance ?? null,
        "connected",
      ]
    );

    const mt5AccountId = accRes.rows[0].id;

    // Upsert trades - expects deals structure with deal_id, orderId, symbol, price, volume, profit, commission, swap, time
    let imported = 0;
    for (const d of deals) {
      const dealId = d.deal_id ?? d.id ?? String(d.ticket ?? d.deal ?? "");
      if (!dealId) continue;

      try {
        await pool.query(
          `INSERT INTO trades (
             user_id, mt5_account_id, deal_id, order_id, symbol, type, volume,
             close_price, profit, commission, swap, magic, comment, close_time, created_at, updated_at
           ) VALUES (
             $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),NOW()
           )
           ON CONFLICT (deal_id) DO UPDATE
             SET profit = EXCLUDED.profit,
                 commission = EXCLUDED.commission,
                 swap = EXCLUDED.swap,
                 close_price = EXCLUDED.close_price,
                 close_time = EXCLUDED.close_time,
                 updated_at = NOW()`,
          [
            userId,
            mt5AccountId,
            dealId,
            d.orderId ?? null,
            d.symbol ?? null,
            d.type ?? null,
            d.volume ?? null,
            d.price ?? null,
            d.profit ?? null,
            d.commission ?? null,
            d.swap ?? null,
            d.magic ?? null,
            d.comment ?? null,
            d.time ? new Date(Number(d.time)) : null,
          ]
        );
        imported++;
      } catch (err) {
        console.error("Failed upsert deal:", err, d);
      }
    }

    return NextResponse.json({
      success: true,
      account: {
        login,
        server,
        currency: account?.currency,
        balance: account?.balance,
        mt5AccountId,
      },
      tradesImported: imported,
      dealsCount: deals.length,
      dealsSample: deals.slice(0, 5),
    });
  } catch (err: any) {
    console.error("MT5 connect route error:", err);
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}
