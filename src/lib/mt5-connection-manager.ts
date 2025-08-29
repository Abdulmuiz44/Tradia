// src/lib/mt5-connection-manager.ts
import { MT5Credentials, ConnectionStatus, ConnectionError, ConnectionValidationResult, MT5ConnectionState } from '@/types/mt5';
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
    initialDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
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

  /**
   * Generate a unique connection key for tracking
   */
  private getConnectionKey(credentials: MT5Credentials): string {
    return `${credentials.server}:${credentials.login}`;
  }

  /**
   * Validate MT5 connection credentials with retry logic
   */
  async validateConnection(
    credentials: MT5Credentials,
    retryConfig: Partial<RetryConfig> = {}
  ): Promise<ConnectionValidationResult> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    const connectionKey = this.getConnectionKey(credentials);

    // Reset retry attempts for this connection
    this.retryAttempts.set(connectionKey, 0);

    return this.validateWithRetry(credentials, config);
  }

  /**
   * Internal method to handle validation with retry logic
   */
  private async validateWithRetry(
    credentials: MT5Credentials,
    config: RetryConfig,
    attempt: number = 1
  ): Promise<ConnectionValidationResult> {
    const connectionKey = this.getConnectionKey(credentials);

    // Update connection state
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
        signal: AbortSignal.timeout(30000), // 30 second timeout per attempt
      });

      const result = await response.json();

      if (!response.ok) {
        const error = this.mapApiErrorToConnectionError(result.error);

        // Check if error is retryable
        if (this.isRetryableError(error, config) && attempt < config.maxAttempts) {
          return this.scheduleRetry(credentials, config, attempt, error, result.message);
        }

        // Final failure
        this.updateConnectionState(connectionKey, {
          status: 'error',
          isValidating: false,
          error,
          errorMessage: result.message || 'Connection validation failed'
        });

        return {
          isValid: false,
          error,
          errorMessage: result.message
        };
      }

      // Success
      this.clearRetryState(connectionKey);
      this.updateConnectionState(connectionKey, {
        status: 'connected',
        isValidating: false,
        error: undefined,
        errorMessage: undefined
      });

      return {
        isValid: true,
        accountInfo: result.accountInfo
      };

    } catch (error) {
      const connectionError = this.mapNetworkErrorToConnectionError(error);

      // Check if error is retryable
      if (this.isRetryableError(connectionError, config) && attempt < config.maxAttempts) {
        return this.scheduleRetry(credentials, config, attempt, connectionError, error instanceof Error ? error.message : 'Network error');
      }

      // Final failure
      this.clearRetryState(connectionKey);
      this.updateConnectionState(connectionKey, {
        status: 'error',
        isValidating: false,
        error: connectionError,
        errorMessage: error instanceof Error ? error.message : 'Network error'
      });

      return {
        isValid: false,
        error: connectionError,
        errorMessage: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Check if an error is retryable based on error recovery recommendations
   */
  private isRetryableError(error: ConnectionError, config: RetryConfig): boolean {
    // First check if error is in the allowed retry list
    if (!config.retryableErrors.includes(error)) {
      return false;
    }

    // Then check if error recovery system recommends auto-retry
    return mt5ErrorRecovery.shouldAutoRecover(error);
  }

  /**
   * Schedule a retry with exponential backoff
   */
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

    // Update retry attempts
    this.retryAttempts.set(connectionKey, attempt);

    // Update connection state to show retry status
    this.updateConnectionState(connectionKey, {
      status: 'error',
      isValidating: false,
      error,
      errorMessage: `${errorMessage} (retrying in ${delay / 1000}s...)`
    });

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.validateWithRetry(credentials, config, attempt + 1).then(resolve);
      }, delay);

      this.retryTimeouts.set(connectionKey, timeout);
    });
  }

  /**
   * Cancel ongoing retry for a connection
   */
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
        error: 'unknown',
        errorMessage: 'Retry cancelled by user'
      });
    }
  }

  /**
   * Clear retry state for a connection
   */
  private clearRetryState(connectionKey: string): void {
    const timeout = this.retryTimeouts.get(connectionKey);
    if (timeout) {
      clearTimeout(timeout);
      this.retryTimeouts.delete(connectionKey);
    }
    this.retryAttempts.delete(connectionKey);
  }

  /**
   * Get current retry attempt count for a connection
   */
  getRetryAttempts(credentials: MT5Credentials): number {
    const connectionKey = this.getConnectionKey(credentials);
    return this.retryAttempts.get(connectionKey) || 0;
  }

  /**
   * Check if a connection is currently retrying
   */
  isRetrying(credentials: MT5Credentials): boolean {
    const connectionKey = this.getConnectionKey(credentials);
    return this.retryTimeouts.has(connectionKey);
  }

  /**
   * Get current connection state
   */
  getConnectionState(credentials: MT5Credentials): MT5ConnectionState | undefined {
    const connectionKey = this.getConnectionKey(credentials);
    return this.connectionStates.get(connectionKey);
  }

  /**
   * Update connection state
   */
  private updateConnectionState(connectionKey: string, updates: Partial<MT5ConnectionState>): void {
    const currentState = this.connectionStates.get(connectionKey) || {
      status: 'disconnected',
      isValidating: false
    };

    const newState = { ...currentState, ...updates };
    this.connectionStates.set(connectionKey, newState);

    // Emit state change event for UI updates
    this.emitStateChange(connectionKey, newState);
  }

  /**
   * Set a validation timeout
   */
  setValidationTimeout(credentials: MT5Credentials, timeoutMs: number = 30000): void {
    const connectionKey = this.getConnectionKey(credentials);

    // Clear existing timeout
    this.clearValidationTimeout(credentials);

    const timeout = setTimeout(() => {
      this.updateConnectionState(connectionKey, {
        status: 'timeout',
        isValidating: false,
        error: 'timeout',
        errorMessage: 'Connection validation timed out'
      });
    }, timeoutMs);

    this.validationTimeouts.set(connectionKey, timeout);
  }

  /**
   * Clear validation timeout
   */
  clearValidationTimeout(credentials: MT5Credentials): void {
    const connectionKey = this.getConnectionKey(credentials);
    const timeout = this.validationTimeouts.get(connectionKey);

    if (timeout) {
      clearTimeout(timeout);
      this.validationTimeouts.delete(connectionKey);
    }
  }

  /**
   * Reset connection state
   */
  resetConnectionState(credentials: MT5Credentials): void {
    const connectionKey = this.getConnectionKey(credentials);
    this.clearValidationTimeout(credentials);
    this.connectionStates.delete(connectionKey);
  }

  /**
   * Map API errors to connection errors
   */
  private mapApiErrorToConnectionError(apiError: string): ConnectionError {
    switch (apiError) {
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

  /**
   * Map network errors to connection errors
   */
  private mapNetworkErrorToConnectionError(error: unknown): ConnectionError {
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        return 'network_error';
      }
      if (error.message.includes('timeout')) {
        return 'timeout';
      }
    }
    return 'unknown';
  }

  /**
   * Emit state change event
   */
  private emitStateChange(connectionKey: string, state: MT5ConnectionState): void {
    // Create a custom event for UI components to listen to
    const event = new CustomEvent('mt5-connection-state-changed', {
      detail: { connectionKey, state }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(event);
    }
  }

  /**
   * Get user-friendly error message
   */
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

  /**
   * Get status display information
   */
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

// Export singleton instance
export const mt5ConnectionManager = MT5ConnectionManager.getInstance();