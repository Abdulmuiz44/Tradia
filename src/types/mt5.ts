// MT5 Connection Types

export interface MT5Credentials {
  id: string;
  user_id: string;
  account_number: string;
  server: string;
  password?: string;
  created_at?: string;
  updated_at?: string;
}

export type ConnectionStatus = 
  | 'connected'
  | 'disconnected'
  | 'connecting'
  | 'error'
  | 'unknown';

export interface MT5Connection {
  credentialId: string;
  userId: string;
  status: ConnectionStatus;
  lastConnected?: Date;
  error?: string;
}
