// src/types/trade.ts
export interface Trade {
  id: string;
  user_id?: string;
  symbol: string;
  direction?: "Buy" | "Sell";
  orderType?: string;
  openTime: string;
  closeTime?: string;
  session?: string;
  lotSize: number;
  entryPrice: number;
  exitPrice?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  pnl: number;
  // NEW: allow optional human-friendly profit/loss string
  profitLoss?: string;
  resultRR?: number;
  rr?: number | string;
  outcome?: "Win" | "Loss" | "Breakeven" | string;
  duration?: string;
  reasonForTrade?: string;
  emotion?: string;
  journalNotes?: string;
  notes?: string;
  strategy?: string;
  beforeScreenshotUrl?: string;
  afterScreenshotUrl?: string;
  commission?: number;
  swap?: number;
  pinned?: boolean;
  tags?: string[];
  reviewed?: boolean;
  created_at?: Date | string;
  updated_at?: Date | string;
}

// MT5-specific trade interface
export interface MT5Trade {
  id: string;
  user_id: string;
  deal_id: string;
  order_id: string;
  symbol: string | null;
  type: string | null;
  volume: number | null;
  open_price: string | null;
  close_price: string | null;
  profit: number | null;
  commission: number | null;
  swap: number | null;
  comment: string | null;
  open_time: Date | null;
  close_time: Date | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface TradeImport {
  deal_id: string;
  order_id: string;
  symbol: string;
  type: string;
  volume: number;
  open_price: number;
  close_price?: number;
  profit: number;
  commission: number;
  swap: number;
  comment?: string;
  open_time: Date | string;
  close_time?: Date | string;
}

export interface TradeStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfit: number;
  totalLoss: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  profitFactor: number;
}
