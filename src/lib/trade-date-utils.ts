export type DateLike = string | number | Date | null | undefined;

export function safeDate(value: DateLike): Date | null {
  if (value === undefined || value === null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const candidate = new Date(value);
    return Number.isNaN(candidate.getTime()) ? null : candidate;
  }
  const parsed = new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getTradeDate(trade: Record<string, any>): Date | null {
  const candidates: DateLike[] = [
    trade.closeTime,
    trade.close_time,
    trade.exit_time,
    trade.updated_at,
    trade.openTime,
    trade.open_time,
    trade.entry_time,
    trade.created_at,
    trade.timestamp,
  ];

  for (const candidate of candidates) {
    const parsed = safeDate(candidate);
    if (parsed) return parsed;
  }

  return null;
}

export function getTradePnl(trade: Record<string, any>): number {
  const value = trade.pnl ?? trade.profit ?? trade.netpl ?? 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}
