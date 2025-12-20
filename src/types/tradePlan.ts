// src/types/tradePlan.ts
export interface TradePlan {
  id: string;
  user_id?: string;
  symbol: string;
  setupType: string;
  plannedEntry: number;
  stopLoss: number;
  takeProfit: number;
  lotSize: number;
  riskReward: number;
  notes?: string;
  status: 'planned' | 'executed' | 'cancelled';
  tier?: 'starter' | 'plus' | 'pro' | 'elite';
  createdAt: string;
  updated_at?: Date;
}

export interface TradePlanForm {
  name: string;
  description?: string;
  symbol: string;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  quantity: number;
  risk_percentage: number;
}

export interface TradePlanStats {
  totalPlans: number;
  activePlans: number;
  completedPlans: number;
  successRate: number;
  totalProfit: number;
  totalLoss: number;
}