// src/app/api/mt5/sync/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { pool } from "@/lib/db";
import { getMetaApi } from "@/lib/metaapi";
import { mapMt5Deals } from "@/lib/mt5-map";
import { z } from "zod";

const bodySchema = z.object({
  mt5AccountId: z.string(),
  from: z.string().optional(),
  to: z.string().optional(),
});

function toDateOrNull(u: unknown): Date | null {
  if (!u) return null;
  if (u instanceof Date) return isNaN(u.getTime()) ? null : u;
  const s = String(u);
  if (/^\d{10}$/.test(s)) return new Date(Number(s) * 1000);
  if (/^\d{13}$/.test(s)) return new Date(Number(s));
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export async function POST(req: Request) {
  try {
    // getServerSession returns Session | null. Session.user typically has only name/email/image.
    // Cast to flexible record to safely read custom id put there by our session callback.
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as Record<string, unknown> | undefined;
    const userId =
      sessionUser && sessionUser["id"] != null ? String(sessionUser["id"]) : undefined;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bodyRaw = (await req.json()) as unknown;
    const parsed = bodySchema.safeParse(bodyRaw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { mt5AccountId, from, to } = parsed.data;

    // fetch account and check ownership
    const accRes = await pool.query<Record<string, unknown>>(
      `SELECT * FROM mt5_accounts WHERE id=$1 AND user_id=$2 LIMIT 1`,
      [mt5AccountId, userId]
    );
    const acc = accRes.rows[0] as Record<string, unknown> | undefined;
    if (!acc) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    // normalize account id and metaapi account id as strings
    const accId = acc["id"] != null ? String(acc["id"]) : undefined;
    const metaapiAccountId =
      acc["metaapi_account_id"] != null ? String(acc["metaapi_account_id"]) : undefined;

    if (!accId) return NextResponse.json({ error: "Invalid account id" }, { status: 500 });
    if (!metaapiAccountId)
      return NextResponse.json({ error: "Account not connected to MetaApi" }, { status: 400 });

  // initialize MetaApi client (lazy import to avoid browser/global eval at module load)
  const metaApi = await getMetaApi();
  const mtAccountApi = metaApi.metatraderAccountApi;
  const account = await mtAccountApi.getAccount(metaapiAccountId);
    const rpc = await account.getRPCConnection();
    if (!rpc.isConnected()) await rpc.connect();

    const fromTs = from ? new Date(from) : new Date(Date.now() - 1000 * 60 * 60 * 24 * 90); // last 90 days
    const toTs = to ? new Date(to) : new Date();

    // get deals via RPC
    const dealsRaw = await rpc.getDealsByTimeRange(fromTs, toTs);
    const normalized = mapMt5Deals(Array.isArray(dealsRaw) ? dealsRaw : []);

    // upsert into mt5_trades in a transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const t of normalized) {
        // ensure deal identifiers are normalized strings or null
        const dealId =
          (t as Record<string, unknown>)["id"] ??
          (t as Record<string, unknown>)["deal_id"] ??
          null;
        const orderId =
          (t as Record<string, unknown>)["orderId"] ??
          (t as Record<string, unknown>)["order_id"] ??
          null;
        const positionId =
          (t as Record<string, unknown>)["positionId"] ??
          (t as Record<string, unknown>)["position_id"] ??
          null;

        await client.query(
          `
          INSERT INTO mt5_trades
            (user_id, mt5_account_id, deal_id, order_id, position_id, symbol, side,
             volume, price, profit, commission, swap, taxes, reason, comment, opened_at, closed_at, updated_at)
          VALUES
            ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW())
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
            userId,
            accId,
            dealId,
            orderId,
            positionId,
            (t as Record<string, unknown>)["symbol"] ?? null,
            (t as Record<string, unknown>)["side"] ?? (t as Record<string, unknown>)["type"] ?? null,
            (t as Record<string, unknown>)["lotSize"] ?? (t as Record<string, unknown>)["volume"] ?? null,
            (t as Record<string, unknown>)["price"] ?? null,
            (t as Record<string, unknown>)["pnl"] ?? (t as Record<string, unknown>)["profit"] ?? null,
            (t as Record<string, unknown>)["commission"] ?? null,
            (t as Record<string, unknown>)["swap"] ?? null,
            (t as Record<string, unknown>)["taxes"] ?? null,
            (t as Record<string, unknown>)["reason"] ?? null,
            (t as Record<string, unknown>)["notes"] ?? (t as Record<string, unknown>)["comment"] ?? null,
            toDateOrNull((t as Record<string, unknown>)["openTime"]) ?? null,
            toDateOrNull((t as Record<string, unknown>)["closeTime"]) ?? null,
          ] as (string | number | null | Date)[]
        );
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      console.error("mt5 sync transaction error:", e);
      throw e;
    } finally {
      client.release();
    }

    return NextResponse.json({ imported: normalized.length });
  } catch (err: unknown) {
    console.error("mt5 sync error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || "Internal error" }, { status: 500 });
  }
}
