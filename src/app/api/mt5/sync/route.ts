// src/app/api/mt5/sync/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getCredentialStorage } from "@/lib/credential-storage";
import { fetchDeals } from "@/lib/mtapi";
import { requireActiveTrialOrPaid } from "@/lib/trial";

export const runtime = "nodejs";

type SyncBody = {
  credentialId?: string;
  from?: string;
  to?: string;
  server?: string;
  login?: string;
  password?: string;
};

export async function POST(req: Request) {
  if (process.env.FREEZE_MT5_INTEGRATION === '1') {
    return NextResponse.json({ error: 'MT5 integration temporarily disabled' }, { status: 503 });
  }
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Trial enforcement via email from session
    const email = (session?.user as any)?.email as string | undefined;
    if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const trial = await requireActiveTrialOrPaid(email);
    if (!trial.allowed) {
      return NextResponse.json({ error: "UPGRADE_REQUIRED" }, { status: 403 });
    }

    const storage = getCredentialStorage();
    const body: SyncBody = await req.json().catch(() => ({}));
    const { credentialId, from, to } = body;

    // Resolve credentials
    let server = body.server?.trim();
    let login = body.login?.trim();
    let password = body.password?.trim();

    if (!server || !login || !password) {
      if (!credentialId) {
        return NextResponse.json(
          { error: "MISSING_CREDENTIALS", message: "Provide credentialId or server/login/password" },
          { status: 400 }
        );
      }
      const creds = await storage.getCredentials(userId, credentialId);
      if (!creds) {
        return NextResponse.json(
          { error: "CREDENTIALS_NOT_FOUND", message: "MT5 credentials not found or inactive" },
          { status: 404 }
        );
      }
      server = creds.server;
      login = creds.login;
      password = creds.password;
    }

    const { deals, account_info } = await fetchDeals(
      { server: server!, login: login!, password: password! },
      from,
      to
    );

    const trades = Array.isArray(deals) ? deals.map((d: any) => mapDealToTrade(d)) : [];

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/trades/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trades, source: 'MT5', accountInfo: account_info }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ error: data?.error || 'Import failed' }, { status: res.status });
    }

    return NextResponse.json({ success: true, ...data });
  } catch (err) {
    console.error("MT5 sync error:", err);
    const message = err instanceof Error ? err.message : "Failed to sync trades";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function mapDealToTrade(d: any) {
  const openTs = d.time_open || d.time || d.open_time || d.Time || d.TimeOpen;
  const closeTs = d.time_close || d.close_time || d.TimeClose;
  const volume = d.volume || d.Volume || d.lots || d.Lots;
  const priceOpen = d.price_open || d.PriceOpen || d.open_price;
  const priceClose = d.price_close || d.PriceClose || d.close_price;
  const profit = d.profit || d.Profit || 0;
  const commission = d.commission ?? d.Commission ?? 0;
  const swap = d.swap ?? d.Swap ?? 0;
  const type = (d.type || d.Type || '').toString().toLowerCase();

  const direction = type.includes('sell') || d.type === 1 ? 'Sell' : 'Buy';
  let outcome: 'Win' | 'Loss' | 'Breakeven' = 'Breakeven';
  if (profit > 0) outcome = 'Win';
  else if (profit < 0) outcome = 'Loss';

  return {
    id: d.ticket ? `MT5_${d.ticket}` : undefined,
    symbol: (d.symbol || d.Symbol || '').toString().toUpperCase(),
    direction,
    orderType: 'Market Execution',
    openTime: normalizeDate(openTs)?.toISOString(),
    closeTime: normalizeDate(closeTs)?.toISOString(),
    lotSize: toNum(volume) || 0.01,
    entryPrice: toNum(priceOpen),
    exitPrice: toNum(priceClose),
    pnl: toNum(profit) || 0,
    outcome,
    duration: undefined,
    journalNotes: (d.comment || d.Comment || '').toString(),
    resultRR: undefined,
    commission: toNum(commission) || 0,
    swap: toNum(swap) || 0,
    updated_at: new Date().toISOString(),
  };
}

function toNum(v: any): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeDate(v: any): Date | undefined {
  if (!v && v !== 0) return undefined;
  if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v;
  if (typeof v === 'number') {
    if (v < 1e11) return new Date(v * 1000);
    return new Date(v);
  }
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? undefined : d;
}
