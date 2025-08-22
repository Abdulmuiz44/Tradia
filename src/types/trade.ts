// src/types/trade.ts
export interface Trade {
  id?: string;
  symbol: string;
  direction?: string;
  orderType?: string;
  openTime: string; // ISO string
  closeTime?: string; // ISO string
  session?: string;
  lotSize?: number | string;
  entryPrice?: number | string;
  stopLossPrice?: number | string;
  takeProfitPrice?: number | string;
  pnl: number;
  profitLoss?: string;
  resultRR?: number | string;
  rr?: string;
  outcome?: "Win" | "Loss" | "Breakeven" | string;
  duration?: string;
  reasonForTrade?: string;
  strategy?: string;
  emotion?: string;
  journalNotes?: string;
  notes?: string;
  raw?: unknown;
  // common optional fields used across components / imports
  tags?: string[];
  reviewed?: boolean;
  pinned?: boolean;
  postNote?: string;
  executionRating?: number;
  updated_at?: string;
  // common shorthand fields (SL/TP/rr used in UI/imports)
  SL?: string | number;
  TP?: string | number;
  exitPrice?: string | number;
  note?: string;
}
