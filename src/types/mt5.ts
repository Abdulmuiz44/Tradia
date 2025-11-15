// MT5 types
export interface MT5Credentials {
  login: string;
  password: string;
  server: string;
  platform?: string;
  investorPassword?: string;
  name?: string;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error' | 'unknown' | 'degraded';

export interface ConnectionError {
  code: string;
  message: string;
  details?: any;
}
