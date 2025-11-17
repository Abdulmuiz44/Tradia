// MT5 Connection Types

export interface MT5Credentials {
  id: string;
  user_id: string;
  account_number: string;
  login?: string;
  name?: string;
  server: string;
  password?: string;
  investorPassword?: string;
  created_at?: string;
  updated_at?: string;
}

export type ConnectionStatus = 
  | 'connected'
  | 'disconnected'
  | 'connecting'
  | 'error'
  | 'degraded'
  | 'unknown';

export interface MT5Connection {
  credentialId: string;
  userId: string;
  status: ConnectionStatus;
  lastConnected?: Date;
  error?: string;
}

export interface ConnectionError {
  code: string;
  message: string;
  details?: any;
}
