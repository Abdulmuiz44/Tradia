// MT5 Types
export interface MT5Credentials {
  id?: string;
  userId?: string;
  server: string;
  login: string;
  password: string;
  name?: string;
  isActive?: boolean;
}

export type ConnectionStatus = 
  | 'connected'
  | 'disconnected'
  | 'connecting'
  | 'error'
  | 'degraded'
  | 'unknown';

export class ConnectionError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ConnectionError';
  }
}

export interface MT5Account {
  id: string;
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
}
