// src/lib/mt5-connection-manager.ts
import {
  MT5Credentials,
  ConnectionStatus,
  ConnectionError,
  ConnectionValidationResult,
  MT5ConnectionState
} from '@/types/mt5';
import { mt5ErrorRecovery } from '@/lib/mt5-error-recovery';

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: ConnectionError[];
}

export class MT5ConnectionManager {
  private static instance: MT5ConnectionManager;
  private connectionStates: Map<string, MT5ConnectionState> = new Map();
  private validationTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private retryAttempts: Map<string, number> = new Map();

  private defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: ['network_error', 'timeout', 'server_unreachable']
  };

  private constructor() {}

  static getInstance(): MT5ConnectionManager {
    if (!MT5ConnectionManager.instance) {
      MT5ConnectionManager.instance = new MT5ConnectionManager();
    }
    return MT5ConnectionManager.instance;
  }

  private getConnectionKey(credentials: MT5Credentials): string {
    return `${credentials.server}:${credentials.login}`;
  }

  async validateConnection(
    credentials: MT5Credentials,
    retryConfig: Partial<RetryConfig> = {}
  ): Promise<ConnectionValidationResult> {
    const config = { ...this.defaultRetryConfig, ...retryConfig } as RetryConfig;
    const connectionKey = this.getConnectionKey(credentials);

    this.retryAttempts.set(connectionKey, 0);

    return this.validateWithRetry(credentials, config);
  }

  private async validateWithRetry(
    credentials: MT5Credentials,
    config: RetryConfig,
    attempt: number = 1
  ): Promise<ConnectionValidationResult> {
    const connectionKey = this.getConnectionKey(credentials);

    // mark validating
    this.updateConnectionState(connectionKey, {
      status: 'validating',
      isValidating: true,
      error: undefined,
      errorMessage: undefined
    });

    try {
      const response = await fetch('/api/mt5/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
        // AbortSignal.timeout exists in modern runtimes — if not present your bundler will warn.
        signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(30000) : undefined
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorCode = this.mapApiErrorToConnectionError(result?.error || result?.code || '');
        const message = result?.message || result?.error || 'Connection validation failed';

        // if retryable and still attempts left => schedule retry
        if (this.isRetryableError(errorCode, config) && attempt < config.maxAttempts) {
          return this.scheduleRetry(credentials, config, attempt, errorCode, message);
        }

        // Final failure -> update state with proper error shape
        this.updateConnectionState(connectionKey, {
          status: 'error',
          isValidating: false,
          error: { code: errorCode, message },
          errorMessage: message
        });

        return {
          isValid: false,
          errors: [message],
          warnings: [],
          error: message,
          errorMessage: message,
          accountInfo: null
        };
      }

      // Success path
      this.clearRetryState(connectionKey);
      this.updateConnectionState(connectionKey, {
        status: 'connected',
        isValidating: false,
        error: undefined,
        errorMessage: undefined
      });

      return {
        isValid: true,
        errors: [],
        warnings: [],
        error: undefined,
        errorMessage: undefined,
        accountInfo: (result && result.accountInfo) || null
      };
    } catch (err) {
      const connectionError = this.mapNetworkErrorToConnectionError(err);
      const message = err instanceof Error ? err.message : 'Network error';

      // Retry if allowed
      if (this.isRetryableError(connectionError, config) && attempt < config.maxAttempts) {
        return this.scheduleRetry(credentials, config, attempt, connectionError, message);
      }

      // Final failure after retries
      this.clearRetryState(connectionKey);
      this.updateConnectionState(connectionKey, {
        status: 'error',
        isValidating: false,
        error: { code: connectionError, message },
        errorMessage: message
      });

      return {
        isValid: false,
        errors: [message],
        warnings: [],
        error: message,
        errorMessage: message,
        accountInfo: null
      };
    }
  }

  private isRetryableError(error: ConnectionError, config: RetryConfig): boolean {
    if (!config.retryableErrors.includes(error)) {
      return false;
    }
    return mt5ErrorRecovery.shouldAutoRecover(error);
  }

  private scheduleRetry(
    credentials: MT5Credentials,
    config: RetryConfig,
    attempt: number,
    error: ConnectionError,
    errorMessage: string
  ): Promise<ConnectionValidationResult> {
    const connectionKey = this.getConnectionKey(credentials);
    const delay = Math.min(
      config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1),
      config.maxDelay
    );

    this.retryAttempts.set(connectionKey, attempt);

    // update state — put structured error object; errorMessage describes retry countdown
    this.updateConnectionState(connectionKey, {
      status: 'error',
      isValidating: false,
      error: { code: error, message: errorMessage },
      errorMessage: `${errorMessage} (retrying in ${Math.round(delay / 1000)}s...)`
    });

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.validateWithRetry(credentials, config, attempt + 1).then(resolve);
      }, delay);

      this.retryTimeouts.set(connectionKey, timeout);
    });
  }

  cancelRetry(credentials: MT5Credentials): void {
    const connectionKey = this.getConnectionKey(credentials);
    const timeout = this.retryTimeouts.get(connectionKey);

    if (timeout) {
      clearTimeout(timeout);
      this.retryTimeouts.delete(connectionKey);
      this.retryAttempts.delete(connectionKey);

      this.updateConnectionState(connectionKey, {
        status: 'error',
        isValidating: false,
        error: { code: 'unknown', message: 'Retry cancelled by user' },
        errorMessage: 'Retry cancelled by user'
      });
    }
  }

  private clearRetryState(connectionKey: string): void {
    const timeout = this.retryTimeouts.get(connectionKey);
    if (timeout) {
      clearTimeout(timeout);
      this.retryTimeouts.delete(connectionKey);
    }
    this.retryAttempts.delete(connectionKey);
  }

  getRetryAttempts(credentials: MT5Credentials): number {
    const connectionKey = this.getConnectionKey(credentials);
    return this.retryAttempts.get(connectionKey) || 0;
  }

  isRetrying(credentials: MT5Credentials): boolean {
    const connectionKey = this.getConnectionKey(credentials);
    return this.retryTimeouts.has(connectionKey);
  }

  getConnectionState(credentials: MT5Credentials): MT5ConnectionState | undefined {
    const connectionKey = this.getConnectionKey(credentials);
    return this.connectionStates.get(connectionKey);
  }

  private updateConnectionState(connectionKey: string, updates: Partial<MT5ConnectionState>): void {
    const currentState = this.connectionStates.get(connectionKey) || {
      status: 'disconnected',
      isValidating: false
    };

    const newState: MT5ConnectionState = { ...currentState, ...updates };
    this.connectionStates.set(connectionKey, newState);

    this.emitStateChange(connectionKey, newState);
  }

  setValidationTimeout(credentials: MT5Credentials, timeoutMs: number = 30000): void {
    const connectionKey = this.getConnectionKey(credentials);

    this.clearValidationTimeout(credentials);

    const timeout = setTimeout(() => {
      this.updateConnectionState(connectionKey, {
        status: 'timeout',
        isValidating: false,
        error: { code: 'timeout', message: 'Connection validation timed out' },
        errorMessage: 'Connection validation timed out'
      });
    }, timeoutMs);

    this.validationTimeouts.set(connectionKey, timeout);
  }

  clearValidationTimeout(credentials: MT5Credentials): void {
    const connectionKey = this.getConnectionKey(credentials);
    const timeout = this.validationTimeouts.get(connectionKey);

    if (timeout) {
      clearTimeout(timeout);
      this.validationTimeouts.delete(connectionKey);
    }
  }

  resetConnectionState(credentials: MT5Credentials): void {
    const connectionKey = this.getConnectionKey(credentials);
    this.clearValidationTimeout(credentials);
    this.connectionStates.delete(connectionKey);
  }

  private mapApiErrorToConnectionError(apiError: string): ConnectionError {
    switch ((apiError || '').toString().toUpperCase()) {
      case 'INVALID_CREDENTIALS':
        return 'invalid_credentials';
      case 'SERVER_UNREACHABLE':
        return 'server_unreachable';
      case 'TERMINAL_NOT_FOUND':
        return 'terminal_not_found';
      case 'LOGIN_FAILED':
        return 'login_failed';
      default:
        return 'unknown';
    }
  }

  private mapNetworkErrorToConnectionError(error: unknown): ConnectionError {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('fetch') || msg.includes('network')) {
        return 'network_error';
      }
      if (msg.includes('timeout')) {
        return 'timeout';
      }
    }
    return 'unknown';
  }

  private emitStateChange(connectionKey: string, state: MT5ConnectionState): void {
    const event = new CustomEvent('mt5-connection-state-changed', {
      detail: { connectionKey, state }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(event);
    }
  }

  getErrorMessage(error: ConnectionError): string {
    switch (error) {
      case 'invalid_credentials':
        return 'Invalid login credentials. Please check your server, login, and password.';
      case 'server_unreachable':
        return 'Cannot reach the MT5 server. Please check your internet connection and server address.';
      case 'terminal_not_found':
        return 'MT5 terminal not found. Please ensure MT5 is installed and running.';
      case 'login_failed':
        return 'Login failed. Please verify your credentials and try again.';
      case 'network_error':
        return 'Network error occurred. Please check your internet connection.';
      case 'timeout':
        return 'Connection timed out. Please try again.';
      default:
        return 'An unknown error occurred. Please try again.';
    }
  }

  getStatusDisplay(status: ConnectionStatus): { label: string; color: string; icon: string } {
    switch (status) {
      case 'disconnected':
        return { label: 'Disconnected', color: 'text-gray-500', icon: '🔴' };
      case 'connecting':
        return { label: 'Connecting...', color: 'text-yellow-500', icon: '🟡' };
      case 'connected':
        return { label: 'Connected', color: 'text-green-500', icon: '🟢' };
      case 'validating':
        return { label: 'Validating...', color: 'text-blue-500', icon: '🔵' };
      case 'error':
        return { label: 'Connection Error', color: 'text-red-500', icon: '❌' };
      case 'timeout':
        return { label: 'Timeout', color: 'text-orange-500', icon: '⏱️' };
      default:
        return { label: 'Unknown', color: 'text-gray-500', icon: '❓' };
    }
  }
}

export const mt5ConnectionManager = MT5ConnectionManager.getInstance();
