export type ConnectionStatus = 'unknown' | 'connected' | 'degraded' | 'error';

export interface MT5Credentials {
  server: string;
  login: string;
  investorPassword?: string;
  password?: string;
  name?: string;
}

export interface ConnectionError {
  message: string;
  code?: string;
}

export interface ValidateConnectionOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

export interface ValidateConnectionResult {
  isValid: boolean;
  errorMessage?: string | null;
}
