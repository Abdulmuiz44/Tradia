// src/lib/mt5-error-recovery.ts
import { ConnectionError } from '@/types/mt5';

export interface ErrorRecoveryAction {
  type: 'retry' | 'reconnect' | 'reconfigure' | 'contact_support' | 'check_terminal';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  autoRetry?: boolean;
  userAction?: string;
}

export interface ErrorRecoveryPlan {
  error: ConnectionError;
  actions: ErrorRecoveryAction[];
  estimatedTime: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export class MT5ErrorRecovery {
  private static instance: MT5ErrorRecovery;

  private constructor() {}

  static getInstance(): MT5ErrorRecovery {
    if (!MT5ErrorRecovery.instance) {
      MT5ErrorRecovery.instance = new MT5ErrorRecovery();
    }
    return MT5ErrorRecovery.instance;
  }

  /**
   * Get recovery plan for a specific error
   */
  getRecoveryPlan(error: ConnectionError): ErrorRecoveryPlan {
    switch (error) {
      case 'invalid_credentials':
        return this.getInvalidCredentialsPlan();
      case 'server_unreachable':
        return this.getServerUnreachablePlan();
      case 'terminal_not_found':
        return this.getTerminalNotFoundPlan();
      case 'login_failed':
        return this.getLoginFailedPlan();
      case 'network_error':
        return this.getNetworkErrorPlan();
      case 'timeout':
        return this.getTimeoutPlan();
      default:
        return this.getUnknownErrorPlan();
    }
  }

  /**
   * Check if error should trigger automatic recovery
   */
  shouldAutoRecover(error: ConnectionError): boolean {
    const autoRecoverableErrors: ConnectionError[] = [
      'network_error',
      'timeout',
      'server_unreachable'
    ];
    return autoRecoverableErrors.includes(error);
  }

  /**
   * Get recovery actions for invalid credentials
   */
  private getInvalidCredentialsPlan(): ErrorRecoveryPlan {
    return {
      error: 'invalid_credentials',
      severity: 'high',
      estimatedTime: '2-5 minutes',
      actions: [
        {
          type: 'reconfigure',
          title: 'Verify Credentials',
          description: 'Double-check your login number, password, and server name',
          priority: 'high',
          userAction: 'Check your MT5 credentials and try again'
        },
        {
          type: 'reconfigure',
          title: 'Use Investor Password',
          description: 'Make sure you\'re using the investor password, not the master password',
          priority: 'high',
          userAction: 'Switch to investor password in MT5 terminal'
        },
        {
          type: 'contact_support',
          title: 'Contact Broker',
          description: 'If credentials are correct, contact your broker\'s support',
          priority: 'medium',
          userAction: 'Contact your broker for credential verification'
        }
      ]
    };
  }

  /**
   * Get recovery actions for server unreachable
   */
  private getServerUnreachablePlan(): ErrorRecoveryPlan {
    return {
      error: 'server_unreachable',
      severity: 'medium',
      estimatedTime: '1-3 minutes',
      actions: [
        {
          type: 'retry',
          title: 'Retry Connection',
          description: 'Server may be temporarily unavailable',
          priority: 'high',
          autoRetry: true
        },
        {
          type: 'reconfigure',
          title: 'Verify Server Name',
          description: 'Check that the server name is spelled correctly',
          priority: 'high',
          userAction: 'Verify server name in MT5 terminal login window'
        },
        {
          type: 'check_terminal',
          title: 'Check MT5 Terminal',
          description: 'Ensure MT5 terminal is running and connected to internet',
          priority: 'medium',
          userAction: 'Start MT5 terminal and check internet connection'
        }
      ]
    };
  }

  /**
   * Get recovery actions for terminal not found
   */
  private getTerminalNotFoundPlan(): ErrorRecoveryPlan {
    return {
      error: 'terminal_not_found',
      severity: 'critical',
      estimatedTime: '5-10 minutes',
      actions: [
        {
          type: 'check_terminal',
          title: 'Install MT5 Terminal',
          description: 'Download and install MetaTrader 5 terminal from your broker',
          priority: 'high',
          userAction: 'Download MT5 from your broker\'s website'
        },
        {
          type: 'check_terminal',
          title: 'Start MT5 Terminal',
          description: 'Launch the MT5 terminal application',
          priority: 'high',
          userAction: 'Open MT5 terminal application'
        },
        {
          type: 'check_terminal',
          title: 'Check Installation',
          description: 'Verify MT5 is properly installed and accessible',
          priority: 'medium',
          userAction: 'Check MT5 installation and system requirements'
        }
      ]
    };
  }

  /**
   * Get recovery actions for login failed
   */
  private getLoginFailedPlan(): ErrorRecoveryPlan {
    return {
      error: 'login_failed',
      severity: 'high',
      estimatedTime: '2-5 minutes',
      actions: [
        {
          type: 'reconfigure',
          title: 'Check Account Status',
          description: 'Verify your trading account is active and not suspended',
          priority: 'high',
          userAction: 'Check account status with your broker'
        },
        {
          type: 'reconfigure',
          title: 'Verify Login Number',
          description: 'Ensure you\'re using the correct account login number',
          priority: 'high',
          userAction: 'Double-check account login number'
        },
        {
          type: 'contact_support',
          title: 'Contact Broker Support',
          description: 'Account may be disabled or require additional verification',
          priority: 'medium',
          userAction: 'Contact broker support for account status'
        }
      ]
    };
  }

  /**
   * Get recovery actions for network error
   */
  private getNetworkErrorPlan(): ErrorRecoveryPlan {
    return {
      error: 'network_error',
      severity: 'medium',
      estimatedTime: '1-2 minutes',
      actions: [
        {
          type: 'retry',
          title: 'Retry Connection',
          description: 'Network issues are usually temporary',
          priority: 'high',
          autoRetry: true
        },
        {
          type: 'check_terminal',
          title: 'Check Internet Connection',
          description: 'Verify your internet connection is stable',
          priority: 'high',
          userAction: 'Check internet connection and try again'
        },
        {
          type: 'check_terminal',
          title: 'Disable VPN/Firewall',
          description: 'Temporary network restrictions may be blocking connection',
          priority: 'medium',
          userAction: 'Try disabling VPN or adjusting firewall settings'
        }
      ]
    };
  }

  /**
   * Get recovery actions for timeout
   */
  private getTimeoutPlan(): ErrorRecoveryPlan {
    return {
      error: 'timeout',
      severity: 'medium',
      estimatedTime: '1-3 minutes',
      actions: [
        {
          type: 'retry',
          title: 'Retry Connection',
          description: 'Connection may be slow due to network conditions',
          priority: 'high',
          autoRetry: true
        },
        {
          type: 'check_terminal',
          title: 'Check Network Speed',
          description: 'Slow internet connection may cause timeouts',
          priority: 'medium',
          userAction: 'Check internet speed and stability'
        },
        {
          type: 'reconfigure',
          title: 'Try Different Server',
          description: 'Some servers may be experiencing high load',
          priority: 'low',
          userAction: 'Try connecting at a different time'
        }
      ]
    };
  }

  /**
   * Get recovery actions for unknown error
   */
  private getUnknownErrorPlan(): ErrorRecoveryPlan {
    return {
      error: 'unknown',
      severity: 'medium',
      estimatedTime: 'Variable',
      actions: [
        {
          type: 'retry',
          title: 'Retry Connection',
          description: 'Unknown errors may be temporary',
          priority: 'high',
          autoRetry: true
        },
        {
          type: 'contact_support',
          title: 'Contact Support',
          description: 'If the problem persists, please contact our support team',
          priority: 'medium',
          userAction: 'Contact Tradia support with error details'
        }
      ]
    };
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(error: ConnectionError): string {
    const plan = this.getRecoveryPlan(error);
    const primaryAction = plan.actions.find(action => action.priority === 'high');

    if (primaryAction) {
      return `${plan.actions[0].description}. ${primaryAction.userAction || ''}`;
    }

    return 'An unexpected error occurred. Please try again or contact support.';
  }

  /**
   * Get error severity level
   */
  getSeverity(error: ConnectionError): 'critical' | 'high' | 'medium' | 'low' {
    return this.getRecoveryPlan(error).severity;
  }

  /**
   * Get estimated recovery time
   */
  getEstimatedTime(error: ConnectionError): string {
    return this.getRecoveryPlan(error).estimatedTime;
  }
}

// Export singleton instance
export const mt5ErrorRecovery = MT5ErrorRecovery.getInstance();