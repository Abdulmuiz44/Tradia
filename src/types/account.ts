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
}

export interface CreateAccountPayload {
  name: string;
  account_size: number;
  currency?: string;
  platform?: 'MT5' | 'MetaTrader4' | 'cTrader' | 'Manual';
  broker?: string;
  mode?: 'manual' | 'broker';
}

export interface UpdateAccountPayload {
  name?: string;
  account_size?: number;
  currency?: string;
  platform?: 'MT5' | 'MetaTrader4' | 'cTrader' | 'Manual';
  broker?: string;
  is_active?: boolean;
}

export interface AccountStats {
  totalAccounts: number;
  activeAccounts: number;
  totalBalance: number;
  totalTradeCount: number;
}
