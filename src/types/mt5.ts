// src/types/mt5.ts
export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'validating'
  | 'error'
  | 'timeout'
  | 'unknown'
  | 'degraded';

export type ConnectionError =
  | 'invalid_credentials'
  | 'server_unreachable'
  | 'terminal_not_found'
  | 'login_failed'
  | 'network_error'
  | 'timeout'
  | 'unknown';

export interface MT5Credentials {
  server: string;
  login: string;
  password: string;
  investorPassword?: string;
  name?: string;
}

export interface MT5Account {
  id: string;
  userId: string;
  server: string;
  login: string;
  name?: string;
  state: ConnectionStatus;
  lastConnectedAt?: Date;
  lastError?: ConnectionError;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConnectionValidationResult {
  isValid: boolean;
  accountInfo?: {
    login: number;
    balance: number;
    currency: string;
    leverage: number;
    company: string;
  };
  error?: ConnectionError;
  errorMessage?: string;
}

export interface ConnectionAttempt {
  id: string;
  accountId: string;
  status: ConnectionStatus;
  startedAt: Date;
  completedAt?: Date;
  error?: ConnectionError;
  errorMessage?: string;
  duration?: number;
}

export interface MT5ConnectionState {
  status: ConnectionStatus;
  account?: MT5Account;
  lastAttempt?: ConnectionAttempt;
  isValidating: boolean;
  error?: ConnectionError;
  errorMessage?: string;
}

export interface StoredCredential {
  id: string;
  userId: string;
  server: string;
  login: string;
  name?: string;
  securityLevel?: string;
  rotationRequired?: boolean;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}