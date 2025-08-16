// src/app/api/mt5/sync/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { pool } from '@/lib/db';
import { metaapi } from '@/lib/metaapi';
import { normalizeDeals } from '@/lib/mt5-map';
import { z } from 'zod';

const bodySchema = z.object({
  mt5AccountId: z.string().uuid(),
  from: z.string().optional(), // ISO
  to: z.string().optional(),   // ISO
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions as any);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { mt5AccountId, from, to } = bodySchema.parse(body);

    // Fetch the account & check ownership
    const accRes = await pool.query(
      `SELECT * FROM mt5_accounts WHERE id=$1 AND user_id=$2`,
      [mt5AccountId, session.user.id]
    );
    const acc = accRes.rows[0];
    if (!acc) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    if (!acc.metaapi_account_id) return NextResponse.json({ error: 'Account not connected' }, { status: 400 });

    // Pull history from MetaApi
    const account = await metaapi.metatraderAccountApi.getAccount(acc.metaapi_account_id);
    const connection = await account.getHistoryStorage(); // aggregated cache
    // In case storage not populated yet, we can also pull via RPC:
    const rpc = await account.getRPCConnection();
    if (!rpc.isConnected()) await rpc.connect();

    const fromTs = from ? new Date(from) : new Date(Date.now() - 1000 * 60 * 60 * 24 * 90); // last 90 days by default
    const toTs = to ? new Date(to) : new Date();

    // MetaApi returns deals with pagination; use RPC for a simple call:
    const deals = await rpc.getDealsByTimeRange(fromTs, toTs);
    const normalized = normalizeDeals(
      deals.map(d => ({
        id: String(d.id),
        orderId: d.orderId ? String(d.orderId) : undefined,
        positionId: d.positionId ? String(d.positionId) : undefined,
        symbol: d.symbol,
        type: d.type,       // e.g. DEAL_TYPE_BUY/SELL/etc
        time: d.time,       // ISO
        volume: Number(d.volume),
        price: Number(d.price),
        commission: Number(d.commission || 0),
        swap: Number(d.swap || 0),
        profit: Number(d.profit || 0),
        comment: d.comment,
        entryType: d.entryType,
        reason: d.reason
      }))
    );

    // Upsert into mt5_trades
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const t of normalized) {
        await client.query(
          `
          INSERT INTO mt5_trades
            (user_id, mt5_account_id, deal_id, order_id, position_id, symbol, side,
             volume, price, profit, commission, swap, taxes, reason, comment, opened_at, closed_at, updated_at)
          VALUES
            ($1,$2,$3,$4,$5,$6,$7,
             $8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW())
          ON CONFLICT (mt5_account_id, deal_id)
          DO UPDATE SET
            price=EXCLUDED.price,
            profit=EXCLUDED.profit,
            commission=EXCLUDED.commission,
            swap=EXCLUDED.swap,
            taxes=EXCLUDED.taxes,
            comment=EXCLUDED.comment,
            updated_at=NOW()
          `,
          [
            session.user.id, acc.id,
            t.deal_id, t.order_id, t.position_id, t.symbol, t.side,
            t.volume, t.price, t.profit, t.commission, t.swap, t.taxes, t.reason, t.comment,
            t.opened_at, t.closed_at
          ]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    return NextResponse.json({ imported: normalized.length });
  } catch (err: any) {
    console.error('mt5 sync error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
