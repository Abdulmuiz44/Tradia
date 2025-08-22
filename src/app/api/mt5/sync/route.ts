// src/app/api/mt5/sync/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
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

    // fetch account and check ownership via Supabase
    const supabase = createClient();
    const { data: acc, error: accErr } = await supabase
      .from("mt5_accounts")
      .select("*")
      .eq("id", mt5AccountId)
      .eq("user_id", userId)
      .maybeSingle();
    if (accErr) throw accErr;
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


    // upsert each trade via Supabase (no explicit transaction)
    for (const t of normalized) {
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

      const row: Record<string, unknown> = {
        user_id: userId,
        mt5_account_id: accId,
        deal_id: dealId,
        order_id: orderId,
        position_id: positionId,
        symbol: (t as Record<string, unknown>)["symbol"] ?? null,
        side:
          (t as Record<string, unknown>)["side"] ??
          (t as Record<string, unknown>)["type"] ??
          null,
        volume:
          (t as Record<string, unknown>)["lotSize"] ??
          (t as Record<string, unknown>)["volume"] ??
          null,
        price: (t as Record<string, unknown>)["price"] ?? null,
        profit:
          (t as Record<string, unknown>)["pnl"] ??
          (t as Record<string, unknown>)["profit"] ??
          null,
        commission: (t as Record<string, unknown>)["commission"] ?? null,
        swap: (t as Record<string, unknown>)["swap"] ?? null,
        taxes: (t as Record<string, unknown>)["taxes"] ?? null,
        reason: (t as Record<string, unknown>)["reason"] ?? null,
        comment:
          (t as Record<string, unknown>)["notes"] ??
          (t as Record<string, unknown>)["comment"] ??
          null,
        opened_at: toDateOrNull((t as Record<string, unknown>)["openTime"]) ?? null,
        closed_at: toDateOrNull((t as Record<string, unknown>)["closeTime"]) ?? null,
        updated_at: new Date(),
      };

      const { error: upErr } = await supabase
        .from("mt5_trades")
        .upsert(row, { onConflict: ["mt5_account_id", "deal_id"] });
      if (upErr) {
        console.error("Failed to upsert mt5 trade:", upErr, row);
      }
    }

    return NextResponse.json({ imported: normalized.length });
  } catch (err: unknown) {
    console.error("mt5 sync error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || "Internal error" }, { status: 500 });
  }
}
