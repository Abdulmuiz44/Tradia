export interface TradePlan {
  id: string;
  symbol: string; // trading pair
  setupType: string;
  plannedEntry?: number;
  stopLoss?: number;
  takeProfit?: number;
  riskReward?: number;
  lotSize?: number;
  reason?: string;
  confidence?: number;
  preChecklist?: string[];
  emotion?: string;
  date?: string;
  // timestamp when the plan was created (optional)
  createdAt?: string;
  screenshotUrl?: string;
  // use lowercase statuses to match context and avoid mismatches
  status: "planned" | "executed" | "canceled" | "missed";
}
