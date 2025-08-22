// src/lib/mt5-map.ts
import { Trade } from "@/types/trade";

/** Small helpers with strict types (no `any`) */
function toNumber(v: unknown): number {
  if (v === undefined || v === null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") {
    const cleaned = v.replace(/[^0-9\.\-eE]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function toString(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") {
    return String(v);
  }
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function toISOStringSafe(v: unknown): string {
  if (v === undefined || v === null || v === "") return "";
  if (v instanceof Date) return isNaN(v.getTime()) ? "" : v.toISOString();
  if (typeof v === "number") {
    const s = String(v);
    if (/^\d{10}$/.test(s)) return new Date(v * 1000).toISOString();
    if (/^\d{13}$/.test(s)) return new Date(v).toISOString();
    const d = new Date(v);
    return isNaN(d.getTime()) ? "" : d.toISOString();
  }
  if (typeof v === "string") {
    if (/^\d{10}$/.test(v)) return new Date(Number(v) * 1000).toISOString();
    if (/^\d{13}$/.test(v)) return new Date(Number(v)).toISOString();
    const d = new Date(v);
    return isNaN(d.getTime()) ? v : d.toISOString();
  }
  const s = toString(v);
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toISOString();
}

/**
 * Converts one MT5 deal (unknown shape) to Partial<Trade>.
 * Very defensive about the input shape.
 */
export function mapMt5DealToTrade(deal: unknown): Partial<Trade> {
  const d = (deal && typeof deal === "object") ? (deal as Record<string, unknown>) : {};

  const idCandidate =
    d["ticket"] ??
    d["deal"] ??
    d["order"] ??
    d["deal_id"] ??
    d["ticket_id"] ??
    d["id"] ??
    d["ticket_no"] ??
    d["order_id"] ??
    undefined;

  const symbol =
    d["symbol"] ??
    d["instrument"] ??
    d["ticker"] ??
    d["asset"] ??
    "UNKNOWN";

  const entryPrice =
    d["entry_price"] ??
    d["open_price"] ??
    d["price_open"] ??
    d["open"] ??
    d["price"] ??
    d["price_open_raw"] ??
    undefined;

  const exitPrice =
    d["exit_price"] ??
    d["close_price"] ??
    d["price_close"] ??
    d["close"] ??
    undefined;

  const lotSize =
    d["volume"] ??
    d["lots"] ??
    d["size"] ??
    d["lot"] ??
    d["contractsize"] ??
    undefined;

  const profitRaw =
    d["profit"] ??
    d["pnl"] ??
    d["netProfit"] ??
    d["profitLoss"] ??
    d["net_pnl"] ??
    d["profit_amount"] ??
    undefined;

  const openTime =
    d["time"] ??
    d["open_time"] ??
    d["open_dt"] ??
    d["time_open"] ??
    d["entry_time"] ??
    d["time_msc"] ??
    undefined;

  const closeTime =
    d["time_done"] ??
    d["close_time"] ??
    d["close_dt"] ??
    d["time_close"] ??
    d["exit_time"] ??
    undefined;

  const notes =
    d["comment"] ??
    d["comments"] ??
    d["label"] ??
    d["client_comment"] ??
    d["note"] ??
    "";

  const strategy =
    d["strategy"] ??
    d["magic"] ??
    d["reason"] ??
    d["strategyName"] ??
    "";

  const profitNum = toNumber(profitRaw);

  const normalized: Partial<Trade> = {
    id: idCandidate ? toString(idCandidate) : undefined,
    symbol: toString(symbol),
    entryPrice: entryPrice !== undefined ? toString(entryPrice) : "",
    exitPrice: exitPrice !== undefined ? toString(exitPrice) : "",
    lotSize: lotSize !== undefined ? toString(lotSize) : "1",
    pnl: profitNum,
    profitLoss: `$${profitNum.toFixed(2)}`,
    openTime: toISOStringSafe(openTime),
    closeTime: toISOStringSafe(closeTime),
    outcome: profitNum > 0 ? "Win" : profitNum < 0 ? "Loss" : "Breakeven",
    notes: toString(notes),
    reasonForTrade: toString(d["reason"] ?? d["strategy"] ?? ""),
    strategy: toString(strategy),
    emotion: toString(d["emotion"] ?? ""),
    raw: deal,
  };

  return normalized;
}

export function mapMt5Deals(deals: unknown[] | undefined | null): Partial<Trade>[] {
  if (!Array.isArray(deals)) return [];
  return deals.filter(Boolean).map((d) => mapMt5DealToTrade(d));
}

/** Backwards-compatible named exports used elsewhere */
export function normalizeDeal(deal: unknown): Partial<Trade> {
  return mapMt5DealToTrade(deal);
}
export function normalizeDeals(deals: unknown[] | undefined | null): Partial<Trade>[] {
  return mapMt5Deals(deals);
}

/** Named object export + default to satisfy both import styles */
export const mt5Map = {
  mapMt5DealToTrade,
  mapMt5Deals,
  normalizeDeal,
  normalizeDeals,
};

export default mt5Map;
