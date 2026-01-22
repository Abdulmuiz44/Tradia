// src/types/account.ts

export interface TradingAccount {
  id: string;
  user_id: string;
  name: string;
  currency: string;
  account_size: number; // Current account balance/size
  initial_balance: number;
  platform: 'MT5' | 'MetaTrader4' | 'cTrader' | 'Manual';
  broker?: string;
  mode: 'manual' | 'broker'; // manual | broker-linked
  credential_id?: string;
  is_active: boolean;
  trade_count?: number;
  total_pnl?: number;
  created_at: string;
  updated_at: string;
  // Prop Firm Specific Fields
  prop_firm?: string;
  daily_loss_limit?: number;
  max_drawdown?: number;
  profit_target?: number;
  max_trading_days?: number | null; // null means no limit
}

export interface CreateAccountPayload {
  name: string;
  account_size: number;
  currency?: string;
  platform?: 'MT5' | 'MetaTrader4' | 'cTrader' | 'Manual';
  broker?: string;
  mode?: 'manual' | 'broker';
  // Prop Firm Fields
  prop_firm?: string;
  daily_loss_limit?: number;
  max_drawdown?: number;
  profit_target?: number;
  max_trading_days?: number | null;
}

export interface UpdateAccountPayload {
  name?: string;
  account_size?: number;
  currency?: string;
  platform?: 'MT5' | 'MetaTrader4' | 'cTrader' | 'Manual';
  broker?: string;
  is_active?: boolean;
  // Prop Firm Fields
  prop_firm?: string;
  daily_loss_limit?: number;
  max_drawdown?: number;
  profit_target?: number;
  max_trading_days?: number | null;
}

export interface AccountStats {
  totalAccounts: number;
  activeAccounts: number;
  totalBalance: number;
  totalTradeCount: number;
}
