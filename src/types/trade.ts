export interface Trade {
  symbol: string;
  direction: string;
  orderType: string;
  openTime: string;
  closeTime: string;
  session: string;
  lotSize: number;
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  pnl: number;
  resultRR: number;
  outcome: string;
  duration: string;
  reasonForTrade: string;
  emotion: string;
  journalNotes: string;
}
