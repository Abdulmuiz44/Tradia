// src/app/api/mt5/connect/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { pool } from '@/lib/db';
import { getMetaApi, METAAPI_ACCOUNT_TYPE, METAAPI_REGION } from '@/lib/metaapi';
import type MetaApi from 'metaapi.cloud-sdk';

type Body = {
  login: string;
  password: string;
  server: string;
  from?: string; // optional ISO date
  to?: string;   // optional ISO date
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // get user id from DB (ensure session includes id, or fetch here by email)
    const ures = await pool.query('SELECT id FROM users WHERE email=$1 LIMIT 1', [userEmail]);
    const user = ures.rows[0];
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const userId: string = user.id;

    const body = (await req.json()) as Body;
    const login = String(body?.login || '').trim();
    const password = String(body?.password || '').trim();
    const server = String(body?.server || '').trim();

    if (!login || !password || !server) {
      return NextResponse.json({ error: 'login, password and server are required' }, { status: 400 });
    }

    // Optional date range for history
    const from = body?.from ? new Date(body.from) : new Date(Date.now() - 365 * 24 * 3600 * 1000);
    const to = body?.to ? new Date(body.to) : new Date();

    const metaapi = getMetaApi();

    // 1) Reuse existing metaapi account if we already linked it
    let metaapiAccountId: string | null = null;

    const accRes = await pool.query(
      `SELECT metaapi_account_id FROM mt5_accounts WHERE user_id=$1 AND login=$2 AND server=$3 LIMIT 1`,
      [userId, login, server]
    );
    if (accRes.rows[0]?.metaapi_account_id) {
      metaapiAccountId = accRes.rows[0].metaapi_account_id;
    }

    // 2) If we don't have one, create via MetaApi
    if (!metaapiAccountId) {
      metaapiAccountId = await createMetaApiAccount(metaapi, {
        name: `Tradia ${login}`,
        login,
        password,
        server,
      });
      // Save mapping (do NOT store password)
      await pool.query(
        `INSERT INTO mt5_accounts (user_id, login, server, metaapi_account_id, created_at, updated_at)
         VALUES ($1,$2,$3,$4,NOW(),NOW())
         ON CONFLICT (metaapi_account_id) DO UPDATE SET updated_at=NOW()`,
        [userId, login, server, metaapiAccountId]
      );
    }

    // 3) Connect & sync
    const { accountInfo, deals } = await connectAndFetch(metaapi, metaapiAccountId, from, to);

    // 4) Upsert account summary (balance/currency if provided)
    await pool.query(
      `UPDATE mt5_accounts
         SET name=$1, currency=$2, balance=$3, state=$4, updated_at=NOW()
       WHERE metaapi_account_id=$5`,
      [
        accountInfo?.name || `Tradia ${login}`,
        accountInfo?.currency || null,
        accountInfo?.balance ?? null,
        'connected',
        metaapiAccountId,
      ]
    );

    // 5) Upsert trades (unique by deal_id)
    //    Make sure you have a UNIQUE index on trades(deal_id)
    //    If your table/columns differ, adjust below.
    let imported = 0;
    for (const d of deals) {
      // MetaApi deal fields you’ll commonly get
      const {
        id: deal_id,
        orderId: order_id,
        symbol,
        type,
        volume,
        price, // deal price (close)
        commission,
        swap,
        profit,
        magic,
        comment,
        time, // close time
      } = d;

      // For open info we’ll try to derive from an associated history order if needed.
      // Many users just store the deal as the source of truth for closed trades.
      await pool.query(
        `INSERT INTO trades (
            user_id, metaapi_account_id, deal_id, order_id, symbol, type, volume,
            close_price, profit, commission, swap, magic, comment, close_time, created_at, updated_at
         ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,
            $8,$9,$10,$11,$12,$13,$14,NOW(),NOW()
         )
         ON CONFLICT (deal_id) DO UPDATE
           SET profit=EXCLUDED.profit,
               commission=EXCLUDED.commission,
               swap=EXCLUDED.swap,
               close_price=EXCLUDED.close_price,
               close_time=EXCLUDED.close_time,
               updated_at=NOW()`,
        [
          userId,
          metaapiAccountId,
          deal_id,
          order_id || null,
          symbol || null,
          type || null,
          volume ?? null,
          // close_price
          d?.price ?? null,
          profit ?? null,
          commission ?? null,
          swap ?? null,
          magic ?? null,
          comment || null,
          time ? new Date(time) : null,
        ]
      );
      imported++;
    }

    return NextResponse.json({
      success: true,
      account: {
        login,
        server,
        currency: accountInfo?.currency,
        balance: accountInfo?.balance,
        metaapiAccountId,
      },
      tradesImported: imported,
    });
  } catch (err: any) {
    console.error('MT5 connect error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to connect/sync MT5' }, { status: 500 });
  }
}

/** Create a MetaApi MT5 account and return its id */
async function createMetaApiAccount(
  metaapi: MetaApi,
  parms: { name: string; login: string; password: string; server: string }
) {
  const created = await metaapi.metatraderAccountApi.createAccount({
    name: parms.name,
    login: parms.login,
    password: parms.password,
    server: parms.server,
    platform: 'mt5',
    // pick one of: 'cloud-g1', 'cloud-g1-cf' etc.
    type: METAAPI_ACCOUNT_TYPE,
    region: METAAPI_REGION,
  } as any);

  return created.id;
}

/** Deploy/connect and fetch account summary + deals by time range */
async function connectAndFetch(
  metaapi: MetaApi,
  metaapiAccountId: string,
  from: Date,
  to: Date
) {
  const account = await metaapi.metatraderAccountApi.getAccount(metaapiAccountId);

  // ensure deployed/connected
  if (!account.state || account.state !== 'DEPLOYED') {
    await account.deploy();
  }
  await account.waitDeployed();

  // RPC connection recommended for history pull
  const connection = account.getRPCConnection();
  await connection.connect();
  await connection.waitSynchronized();

  // Pull deals & (optionally) orders
  const deals = await connection.getDealsByTimeRange(from, to);
  // const orders = await connection.getHistoryOrdersByTimeRange(from, to); // if you want them too

  // Try to gather simple account info; MetaApi exposes account information via terminalState/accountInformation
  let accountInfo: { name?: string; currency?: string; balance?: number } = {};
  try {
    const info = await connection.getAccountInformation();
    accountInfo = {
      name: info?.name,
      currency: info?.currency,
      balance: info?.balance,
    };
  } catch {
    // ignore if not available yet
  }

  // Disconnect RPC (good housekeeping)
  try {
    await connection.close();
  } catch {}

  return { accountInfo, deals };
}
