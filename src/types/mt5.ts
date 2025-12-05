/**
 * DEPRECATED: MT5 integration has been removed from Tradia
 * This file is kept for backwards compatibility only
 * All MT5 type definitions have been removed from the codebase
 */

export type ConnectionStatus = never;

/**
 * @deprecated MT5 integration removed
 */
export interface MT5Credentials {
  server?: string;
  login?: string;
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
