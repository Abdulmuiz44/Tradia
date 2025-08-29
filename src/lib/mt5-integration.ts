// src/lib/mt5-integration.ts
import { syncProgressTracker } from './sync-progress';
import { Trade } from '@/types/trade';

export interface MT5Credentials {
  server: string;
  login: string;
  password: string;
  name?: string;
}

export interface MT5Requirements {
  title: string;
  description: string;
  required: boolean;
  validator: (value: any) => boolean;
  errorMessage: string;
}

export interface AccountLimits {
  maxAccounts: number;
  planName: string;
  canUpgrade: boolean;
}

export interface MT5ConnectionResult {
  success: boolean;
  accountId?: string;
  accountInfo?: any;
  error?: string;
}

export interface MT5SyncResult {
  success: boolean;
  syncId?: string;
  totalTrades?: number;
  newTrades?: number;
  updatedTrades?: number;
  skippedTrades?: number;
  error?: string;
}

export interface MT5TradeData {
  ticket: number;
  symbol: string;
  type: number; // MT5 order type
  volume: number;
  price_open: number;
  price_close: number;
  profit: number;
  commission: number;
  swap: number;
  time_open: number; // timestamp
  time_close: number; // timestamp
  comment?: string;
  reason?: number;
}

/**
 * MT5 Integration Service - Handles the complete MT5 workflow
 */
export class MT5IntegrationService {
  private static instance: MT5IntegrationService;
  private backendUrl: string;

  // MT5 Connection Requirements
  private requirements: MT5Requirements[] = [
    {
      title: "MT5 Terminal",
      description: "MetaTrader 5 terminal must be installed and running on your computer",
      required: true,
      validator: () => true, // Client-side check
      errorMessage: "Please install and start MetaTrader 5 terminal"
    },
    {
      title: "Server Address",
      description: "Valid broker server address (e.g., ICMarketsSC-MT5)",
      required: true,
      validator: (value: string) => Boolean(value && value.trim().length > 0),
      errorMessage: "Please enter a valid server address"
    },
    {
      title: "Account Login",
      description: "Your MT5 account number (numeric)",
      required: true,
      validator: (value: string) => /^\d+$/.test(value) && value.length >= 5,
      errorMessage: "Please enter a valid account number (digits only)"
    },
    {
      title: "Password",
      description: "Your MT5 account password (investor or master)",
      required: true,
      validator: (value: string) => Boolean(value && value.length >= 4),
      errorMessage: "Please enter a valid password (minimum 4 characters)"
    },
    {
      title: "Network Connection",
      description: "Stable internet connection to broker servers",
      required: true,
      validator: () => navigator.onLine,
      errorMessage: "Please check your internet connection"
    },
    {
      title: "MT5 API Access",
      description: "MT5 terminal must allow automated trading/API access",
      required: true,
      validator: () => true, // Will be checked during connection
      errorMessage: "Please enable automated trading in MT5 terminal settings"
    }
  ];

  // Account Limits by Plan (matching landing page promises)
  private planLimits: Record<string, AccountLimits> = {
    'starter': { maxAccounts: 1, planName: 'Starter (Free)', canUpgrade: true },
    'pro': { maxAccounts: 3, planName: 'Pro', canUpgrade: true },
    'plus': { maxAccounts: 5, planName: 'Plus', canUpgrade: true },
    'elite': { maxAccounts: -1, planName: 'Elite', canUpgrade: false } // -1 = unlimited
  };

  private constructor() {
    this.backendUrl = process.env.NEXT_PUBLIC_MT5_BACKEND_URL || 'http://127.0.0.1:5000';
  }

  /**
   * Check backend health
   */
  async checkBackendHealth(): Promise<{ healthy: boolean; version?: string; error?: string }> {
    try {
      const response = await fetch(`${this.backendUrl}/health`);
      if (!response.ok) {
        return { healthy: false, error: `HTTP ${response.status}` };
      }

      const data = await response.json();
      return {
        healthy: data.status === 'healthy',
        version: data.version
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Check MT5 requirements via backend
   */
  async checkRequirements(): Promise<{ mt5_installed: boolean; mt5_running: boolean; api_accessible: boolean; errors: string[] }> {
    try {
      const response = await fetch(`${this.backendUrl}/requirements`);
      if (!response.ok) {
        return {
          mt5_installed: false,
          mt5_running: false,
          api_accessible: false,
          errors: [`Backend error: HTTP ${response.status}`]
        };
      }

      const data = await response.json();
      if (!data.success) {
        return {
          mt5_installed: false,
          mt5_running: false,
          api_accessible: false,
          errors: [data.error || 'Requirements check failed']
        };
      }

      const reqs = data.requirements || {};
      return {
        mt5_installed: reqs.mt5_installed || false,
        mt5_running: reqs.mt5_running || false,
        api_accessible: reqs.api_accessible || false,
        errors: reqs.errors || []
      };
    } catch (error) {
      return {
        mt5_installed: false,
        mt5_running: false,
        api_accessible: false,
        errors: [error instanceof Error ? error.message : 'Network error']
      };
    }
  }

  static getInstance(): MT5IntegrationService {
    if (!MT5IntegrationService.instance) {
      MT5IntegrationService.instance = new MT5IntegrationService();
    }
    return MT5IntegrationService.instance;
  }

  /**
   * Get connection requirements
   */
  getRequirements(): MT5Requirements[] {
    return this.requirements;
  }

  /**
   * Validate credentials against requirements
   */
  validateCredentials(credentials: MT5Credentials): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check each requirement
    this.requirements.forEach(req => {
      if (!req.required) return;

      let value: any;
      switch (req.title) {
        case 'Server Address':
          value = credentials.server;
          break;
        case 'Account Login':
          value = credentials.login;
          break;
        case 'Password':
          value = credentials.password;
          break;
        case 'Network Connection':
          value = navigator.onLine;
          break;
        default:
          value = true;
      }

      if (!req.validator(value)) {
        errors.push(req.errorMessage);
      }
    });

    return { valid: errors.length === 0, errors };
  }

  /**
   * Check account limits for user
   */
  async checkAccountLimits(userId: string): Promise<{ canAdd: boolean; currentCount: number; limit: number; plan: AccountLimits }> {
    try {
      // Get user's current accounts
      const response = await fetch('/api/mt5/accounts');
      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }

      const data = await response.json();
      const currentCount = data.accounts?.length || 0;

      // For now, assume starter plan (1 account) - in production, get from user subscription
      const userPlan = 'starter'; // TODO: Get from user subscription
      const plan = this.planLimits[userPlan];

      const canAdd = plan.maxAccounts === -1 || currentCount < plan.maxAccounts;

      return {
        canAdd,
        currentCount,
        limit: plan.maxAccounts,
        plan
      };
    } catch (error) {
      console.error('Failed to check account limits:', error);
      // Default to starter plan limits
      const plan = this.planLimits['starter'];
      return {
        canAdd: true, // Allow at least one account
        currentCount: 0,
        limit: plan.maxAccounts,
        plan
      };
    }
  }

  /**
   * Step 1: Connect MT5 Account
   * User provides credentials, we validate and store securely
   */
  async connectAccount(credentials: MT5Credentials, userId?: string): Promise<MT5ConnectionResult> {
    try {
      // Validate credentials against requirements
      const validation = this.validateCredentials(credentials);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join('. ')
        };
      }

      // Check account limits if userId provided
      if (userId) {
        const limits = await this.checkAccountLimits(userId);
        if (!limits.canAdd) {
          return {
            success: false,
            error: `Account limit reached (${limits.currentCount}/${limits.limit}). ${limits.plan.canUpgrade ? 'Upgrade your plan to add more accounts.' : 'Contact support for assistance.'}`
          };
        }
      }

      // Call backend to validate connection
      const response = await fetch(`${this.backendUrl}/validate_mt5`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server: credentials.server,
          login: credentials.login,
          password: credentials.password
        })
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.detail || 'Connection validation failed'
        };
      }

      const result = await response.json();

      // Store credentials securely (you might want to encrypt these)
      const accountId = await this.storeCredentials(credentials, result.account_info);

      return {
        success: true,
        accountId,
        accountInfo: result.account_info
      };

    } catch (error) {
      console.error('MT5 connection error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  /**
   * Step 2: Sync Trade History
   * Fetch trades from MT5 and sync to Tradia
   */
  async syncTradeHistory(
    accountId: string,
    options: {
      fromDate?: Date;
      toDate?: Date;
      userId: string;
    }
  ): Promise<MT5SyncResult> {
    try {
      // Get stored credentials
      const credentials = await this.getStoredCredentials(accountId);
      if (!credentials) {
        return {
          success: false,
          error: 'Account credentials not found'
        };
      }

      // Start progress tracking
      const syncSteps = [
        { name: "Connecting to MT5", description: "Establishing connection to MetaTrader 5", weight: 15 },
        { name: "Authenticating", description: "Verifying account credentials", weight: 10 },
        { name: "Fetching Account Info", description: "Retrieving account information", weight: 10 },
        { name: "Analyzing Trade History", description: "Scanning for new trades", weight: 20 },
        { name: "Downloading Trades", description: "Retrieving trade data", weight: 25 },
        { name: "Processing Data", description: "Validating and formatting trades", weight: 10 },
        { name: "Saving to Database", description: "Storing trades securely", weight: 10 }
      ];

      const syncId = await syncProgressTracker.startSync(
        options.userId,
        accountId,
        syncSteps,
        { canCancel: true, metadata: { accountName: credentials.name } }
      );

      // Update progress: Connecting
      await syncProgressTracker.updateProgress(syncId, {
        currentStep: "Connecting to MT5",
        currentStepIndex: 0,
        message: "Establishing connection to MetaTrader 5...",
        progress: 5
      });

      // Call backend to sync trades
      const syncPayload = {
        server: credentials.server,
        login: credentials.login,
        password: credentials.password,
        from_ts: options.fromDate?.toISOString(),
        to_ts: options.toDate?.toISOString(),
        sync_id: syncId
      };

      const response = await fetch(`${this.backendUrl}/sync_mt5`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncPayload)
      });

      if (!response.ok) {
        const error = await response.json();
        await syncProgressTracker.completeSync(syncId, {
          errorMessage: error.detail || 'Sync failed'
        });
        return {
          success: false,
          error: error.detail || 'Sync failed'
        };
      }

      const result = await response.json();

      // Import trades to Tradia
      const importResult = await this.importTradesToTradia(
        result.trades || [],
        result.account || {},
        syncId,
        options.userId
      );

      // Complete progress tracking
      await syncProgressTracker.completeSync(syncId, {
        totalTrades: importResult.totalTrades,
        newTrades: importResult.newTrades,
        updatedTrades: importResult.updatedTrades,
        skippedTrades: importResult.skippedTrades
      });

      return {
        success: true,
        syncId,
        totalTrades: importResult.totalTrades,
        newTrades: importResult.newTrades,
        updatedTrades: importResult.updatedTrades,
        skippedTrades: importResult.skippedTrades
      };

    } catch (error) {
      console.error('MT5 sync error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed'
      };
    }
  }

  /**
   * Step 3: Map MT5 Data to Tradia Trade Format
   */
  private mapMT5ToTradiaTrade(mt5Trade: MT5TradeData): Partial<Trade> {
    // Map MT5 order types to Tradia directions
    const getDirection = (type: number): string => {
      switch (type) {
        case 0: return 'Buy';   // MT5 BUY
        case 1: return 'Sell';  // MT5 SELL
        default: return 'Unknown';
      }
    };

    // Calculate outcome based on profit
    const getOutcome = (profit: number): 'Win' | 'Loss' | 'Breakeven' => {
      if (profit > 0) return 'Win';
      if (profit < 0) return 'Loss';
      return 'Breakeven';
    };

    // Calculate duration
    const durationMs = (mt5Trade.time_close - mt5Trade.time_open) * 1000;
    const durationMinutes = Math.floor(durationMs / (1000 * 60));

    return {
      id: `MT5_${mt5Trade.ticket}`,
      symbol: mt5Trade.symbol,
      direction: getDirection(mt5Trade.type),
      orderType: 'Market Execution', // MT5 trades are typically market orders
      openTime: new Date(mt5Trade.time_open * 1000).toISOString(),
      closeTime: new Date(mt5Trade.time_close * 1000).toISOString(),
      lotSize: mt5Trade.volume,
      entryPrice: mt5Trade.price_open,
      exitPrice: mt5Trade.price_close,
      pnl: mt5Trade.profit,
      outcome: getOutcome(mt5Trade.profit),
      duration: `${durationMinutes} min`,
      journalNotes: mt5Trade.comment || '',
      commission: mt5Trade.commission,
      swap: mt5Trade.swap,
      // Calculate RR based on entry/exit prices (simplified)
      resultRR: this.calculateRiskReward(mt5Trade),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Calculate Risk-Reward ratio from MT5 trade data
   */
  private calculateRiskReward(mt5Trade: MT5TradeData): number {
    const { price_open, price_close, profit, type } = mt5Trade;

    if (profit <= 0) return -1; // Loss = -1R

    // For buys: RR = (close - open) / (open - stop_loss_assumption)
    // For sells: RR = (open - close) / (stop_loss_assumption - open)
    // Since we don't have actual SL from MT5, we'll use a simplified calculation

    const priceDiff = Math.abs(price_close - price_open);
    if (priceDiff === 0) return 0;

    // Assume 2% stop loss as default (this can be made configurable)
    const assumedRisk = price_open * 0.02;
    return priceDiff / assumedRisk;
  }

  /**
   * Import trades to Tradia database
   */
  private async importTradesToTradia(
    mt5Trades: MT5TradeData[],
    accountInfo: any,
    syncId: string,
    userId: string
  ): Promise<{
    totalTrades: number;
    newTrades: number;
    updatedTrades: number;
    skippedTrades: number;
  }> {
    let newTrades = 0;
    let updatedTrades = 0;
    let skippedTrades = 0;

    // Update progress: Processing
    await syncProgressTracker.updateProgress(syncId, {
      currentStep: "Processing Data",
      currentStepIndex: 5,
      message: "Validating and formatting trades...",
      progress: 75,
      totalTrades: mt5Trades.length,
      processedTrades: 0
    });

    // Process each trade
    for (let i = 0; i < mt5Trades.length; i++) {
      const mt5Trade = mt5Trades[i];
      const tradiaTrade = this.mapMT5ToTradiaTrade(mt5Trade);

      try {
        // Import via API
        const response = await fetch('/api/trades/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trades: [tradiaTrade],
            source: 'MT5',
            accountInfo,
            syncId
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Import failed: ${response.status}`);
        }

        if (response.ok) {
          const result = await response.json();
          newTrades += result.newTrades || 0;
          updatedTrades += result.updatedTrades || 0;
        } else {
          console.error(`Failed to import trade ${mt5Trade.ticket}:`, await response.text());
          skippedTrades++;
        }

        // Update progress every 10 trades
        if ((i + 1) % 10 === 0 || i === mt5Trades.length - 1) {
          const progressPercent = 75 + Math.floor(((i + 1) / mt5Trades.length) * 20);
          await syncProgressTracker.updateProgress(syncId, {
            progress: Math.min(progressPercent, 95),
            processedTrades: i + 1,
            newTrades,
            updatedTrades,
            message: `Processing trade ${i + 1} of ${mt5Trades.length}...`
          });
        }

      } catch (error) {
        console.error(`Error importing trade ${mt5Trade.ticket}:`, error);
        skippedTrades++;
      }
    }

    return {
      totalTrades: mt5Trades.length,
      newTrades,
      updatedTrades,
      skippedTrades
    };
  }

  /**
   * Store MT5 credentials securely
   */
  private async storeCredentials(credentials: MT5Credentials, accountInfo: any): Promise<string> {
    // In a real implementation, you'd encrypt these credentials
    // For now, we'll store them via API (you should encrypt them)

    const accountId = `mt5_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const response = await fetch('/api/mt5/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: accountId,
        ...credentials,
        accountInfo,
        state: 'connected'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to store account credentials');
    }

    const result = await response.json();
    return result.account?.id || accountId;
  }

  /**
   * Get stored MT5 credentials
   */
  private async getStoredCredentials(accountId: string): Promise<MT5Credentials | null> {
    try {
      const response = await fetch(`/api/mt5/accounts/${accountId}`);
      if (!response.ok) {
        console.error('Failed to retrieve account:', response.status);
        return null;
      }

      const data = await response.json();
      const account = data.account || data;

      if (!account || !account.server || !account.login) {
        console.error('Invalid account data:', account);
        return null;
      }

      return {
        server: account.server,
        login: account.login,
        password: account.password, // In real implementation, this would be decrypted
        name: account.name
      };
    } catch (error) {
      console.error('Failed to retrieve credentials:', error);
      return null;
    }
  }

  /**
   * Get user's connected MT5 accounts
   */
  async getUserAccounts(userId?: string): Promise<any[]> {
    try {
      const response = await fetch('/api/mt5/accounts');
      if (!response.ok) {
        console.error('Failed to get accounts:', response.status);
        return [];
      }

      const data = await response.json();
      return data.accounts || [];
    } catch (error) {
      console.error('Failed to get user accounts:', error);
      return [];
    }
  }

  /**
   * Test connection to MT5 account
   */
  async testConnection(credentials: MT5Credentials): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.backendUrl}/test_connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.detail || 'Connection test failed' };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }
}

// Export singleton instance
export const mt5Integration = MT5IntegrationService.getInstance();