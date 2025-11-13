// MT5 Connection Types

export interface MT5Credentials {
  id?: string;
  userId?: string;
  server: string;
  login: string;
  password: string;
  platform?: string;
  nickname?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ConnectionStatus = 
  | 'connected' 
  | 'disconnected' 
  | 'connecting' 
  | 'error'
  | 'degraded'
  | 'unknown';

export interface MT5ConnectionInfo {
  credentialId: string;
  status: ConnectionStatus;
  lastChecked: Date;
  error?: string;
}

export interface MT5Account {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  profit: number;
  currency: string;
}

export interface MT5Position {
  ticket: number;
  symbol: string;
  type: 'buy' | 'sell';
  volume: number;
  openPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  profit: number;
  swap: number;
  commission: number;
  openTime: Date;
}
