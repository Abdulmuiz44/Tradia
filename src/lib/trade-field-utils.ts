// src/lib/trade-field-utils.ts
// Utility helpers to resolve common trade field variants across legacy schemas.

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isValidValue = (value: unknown): boolean => value !== undefined && value !== null && value !== "";

const resolveTradeField = (trade: Record<string, any>, keys: string[]): string | null => {
  for (const key of keys) {
    const value = (trade as Record<string, any>)[key];
    if (isValidValue(value)) {
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (typeof value === "number" && !Number.isNaN(value)) {
        const timestamp = new Date(value);
        if (!Number.isNaN(timestamp.getTime())) {
          return timestamp.toISOString();
        }
      }
      return typeof value === "string" ? value : String(value);
    }
  }
  return null;
};

export const getTradeOpenTime = (trade: Record<string, any>): string | null =>
  resolveTradeField(trade, [
    "openTime",
    "open_time",
    "entry_time",
    "entryTime",
    "entrytime",
    "opentime",
    "timestamp",
    "created_at",
  ]);

export const getTradeCloseTime = (trade: Record<string, any>): string | null =>
  resolveTradeField(trade, [
    "closeTime",
    "close_time",
    "exit_time",
    "exitTime",
    "exittime",
    "closetime",
    "timestamp",
    "updated_at",
  ]);

export const withDerivedTradeTimes = <T extends Record<string, any>>(trade: T): T & {
  openTime: string | null;
  closeTime: string | null;
  entry_time: string | null;
  exit_time: string | null;
} => {
  const open = getTradeOpenTime(trade);
  const close = getTradeCloseTime(trade);

  return {
    ...trade,
    openTime: isNonEmptyString(trade.openTime) ? trade.openTime : open,
    closeTime: isNonEmptyString(trade.closeTime) ? trade.closeTime : close,
    entry_time: isNonEmptyString(trade.entry_time) ? trade.entry_time : open,
    exit_time: isNonEmptyString(trade.exit_time) ? trade.exit_time : close,
  };
};
