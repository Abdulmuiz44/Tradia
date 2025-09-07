// src/lib/mt5-integration.ts
/**
 * Lightweight MT5 integration wrapper for the frontend/backend to call.
 * - Exports `mt5Integration` singleton.
 * - Re-exports MT5Credentials type for convenience.
 *
 * NOTE: This file is intentionally defensive — many environments (server vs client)
 * may not have `window` / `navigator`. We guard those accesses.
 */

import { syncProgressTracker } from "./sync-progress";
import type { Trade } from "@/types/trade";
export type { MT5Credentials } from "@/types/mt5";
import type { MT5Credentials as _MT5Credentials } from "@/types/mt5";

/* Public types used by consumers */
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
  time_open: number; // timestamp (seconds)
  time_close: number; // timestamp (seconds)
  comment?: string;
  reason?: number;
}

/**
 * MT5IntegrationService
 * - Responsible for validating credentials, connecting, syncing, mapping trades.
 * - In this codebase it's a thin wrapper around a backend MT5 service.
 */
export class MT5IntegrationService {
  private static instance: MT5IntegrationService;
  private backendUrl: string;
  private requirements: MT5Requirements[];

  // Account Limits by Plan (matching landing page promises)
  private planLimits: Record<string, AccountLimits> = {
    starter: { maxAccounts: 1, planName: "Starter (Free)", canUpgrade: true },
    pro: { maxAccounts: 3, planName: "Pro", canUpgrade: true },
    plus: { maxAccounts: 5, planName: "Plus", canUpgrade: true },
    elite: { maxAccounts: -1, planName: "Elite", canUpgrade: false }, // -1 = unlimited
  };

  private constructor() {
    this.backendUrl = this.getBackendUrl();

    // Initialize requirements here (so `this` is available for validators)
    this.requirements = [
      {
        title: "MT5 Account Access",
        description: "Valid MT5 trading account with broker server access",
        required: true,
        validator: () => true,
        errorMessage: "Please ensure you have a valid MT5 trading account",
      },
      {
        title: "Server Address",
        description: "Valid broker server address (e.g., ICMarketsSC-MT5)",
        required: true,
        validator: (value: string) => Boolean(value && value.toString().trim().length > 0),
        errorMessage: "Please enter a valid server address",
      },
      {
        title: "Account Login",
        description: "Your MT5 account number (numeric)",
        required: true,
        validator: (value: string) =>
          typeof value === "string" ? /^\d+$/.test(value) && value.length >= 5 : /^\d+$/.test(String(value)),
        errorMessage: "Please enter a valid account number (digits only)",
      },
      {
        title: "Password",
        description: "Your MT5 account password (investor or master)",
        required: true,
        validator: (value: string) => Boolean(value && value.toString().length >= 4),
        errorMessage: "Please enter a valid password (minimum 4 characters)",
      },
      {
        title: "Network Connection",
        description: "Stable internet connection to broker servers",
        required: true,
        validator: () => (typeof navigator !== "undefined" ? navigator.onLine : true),
        errorMessage: "Please check your internet connection",
      },
      {
        title: "Mobile-Compatible Connection",
        description: "Connection method compatible with mobile devices",
        required: true,
        validator: () => this.isMobileCompatible(),
        errorMessage: "Please use a mobile-compatible MT5 connection method",
      },
    ];
  }

  private getBackendUrl(): string {
    const isProduction = process.env.NODE_ENV === "production";

    // Prefer mobile backend when configured
    if (this.isMobileDevice()) {
      return (
        process.env.NEXT_PUBLIC_MT5_MOBILE_BACKEND_URL ||
        process.env.NEXT_PUBLIC_MT5_BACKEND_URL ||
        "https://mt5-api.tradia.app"
      );
    }

    if (!isProduction) {
      return process.env.NEXT_PUBLIC_MT5_BACKEND_URL || "http://127.0.0.1:5000";
    }

    return process.env.NEXT_PUBLIC_MT5_BACKEND_URL || "https://mt5-api.tradiaai.app";
  }

  private isMobileDevice(): boolean {
    if (typeof window === "undefined") return false;
    const ua = navigator.userAgent || "";
    const mobileKeywords = ["mobile", "android", "iphone", "ipad", "ipod", "blackberry", "windows phone"];
    return mobileKeywords.some((k) => ua.toLowerCase().includes(k)) || window.innerWidth <= 768;
  }

  private isMobileCompatible(): boolean {
    // allow mobile if we have a mobile backend or it's not a mobile device
    if (!this.isMobileDevice()) return true;
    return Boolean(process.env.NEXT_PUBLIC_MT5_MOBILE_BACKEND_URL || process.env.NEXT_PUBLIC_MT5_WEB_API_URL);
  }

  private supportsWebMT5(): boolean {
    return Boolean(process.env.NEXT_PUBLIC_MT5_MOBILE_BACKEND_URL || process.env.NEXT_PUBLIC_MT5_WEB_API_URL);
  }

  static getInstance(): MT5IntegrationService {
    if (!MT5IntegrationService.instance) {
      MT5IntegrationService.instance = new MT5IntegrationService();
    }
    return MT5IntegrationService.instance;
  }

  getRequirements(): MT5Requirements[] {
    return this.requirements;
  }

  validateCredentials(credentials: _MT5Credentials): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    this.requirements.forEach((req) => {
      if (!req.required) return;
      let value: any = true;
      switch (req.title) {
        case "Server Address":
          value = credentials.server;
          break;
        case "Account Login":
          value = credentials.login;
          break;
        case "Password":
          value = credentials.password;
          break;
        case "Network Connection":
          value = typeof navigator !== "undefined" ? navigator.onLine : true;
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

  async checkAccountLimits(userId: string): Promise<{ canAdd: boolean; currentCount: number; limit: number; plan: AccountLimits }> {
    try {
      // call your app API to list accounts for the user
      const res = await fetch(`/api/mt5/accounts?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      const currentCount = (data.accounts && Array.isArray(data.accounts) ? data.accounts.length : 0) || 0;

      // TODO: determine plan from user subscription; default to starter
      const userPlan = "starter";
      const plan = this.planLimits[userPlan] ?? this.planLimits["starter"];
      const canAdd = plan.maxAccounts === -1 || currentCount < plan.maxAccounts;

      return { canAdd, currentCount, limit: plan.maxAccounts, plan };
    } catch (err) {
      console.error("checkAccountLimits error:", err);
      const plan = this.planLimits["starter"];
      return { canAdd: true, currentCount: 0, limit: plan.maxAccounts, plan };
    }
  }

  async connectAccount(credentials: _MT5Credentials, userId?: string): Promise<MT5ConnectionResult> {
    try {
      const validation = this.validateCredentials(credentials);
      if (!validation.valid) {
        return { success: false, error: validation.errors.join(". ") };
      }

      if (userId) {
        const limits = await this.checkAccountLimits(userId);
        if (!limits.canAdd) {
          return {
            success: false,
            error: `Account limit reached (${limits.currentCount}/${limits.limit}). ${limits.plan.canUpgrade ? "Upgrade your plan to add more accounts." : "Contact support for assistance."}`,
          };
        }
      }

      const response = await fetch(`${this.backendUrl}/validate_mt5`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ server: credentials.server, login: credentials.login, password: credentials.password }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return { success: false, error: error.detail || "Connection validation failed" };
      }

      const result = await response.json();
      const accountId = await this.storeCredentials(credentials, result.account_info);

      return { success: true, accountId, accountInfo: result.account_info };
    } catch (err) {
      console.error("connectAccount error:", err);
      return { success: false, error: err instanceof Error ? err.message : "Connection failed" };
    }
  }

  async syncTradeHistory(
    accountId: string,
    options: { fromDate?: Date; toDate?: Date; userId: string }
  ): Promise<MT5SyncResult> {
    try {
      const credentials = await this.getStoredCredentials(accountId);
      if (!credentials) return { success: false, error: "Account credentials not found" };

      const syncSteps = [
        { name: "Connecting to MT5", description: "Establishing connection to MetaTrader 5", weight: 15 },
        { name: "Authenticating", description: "Verifying account credentials", weight: 10 },
        { name: "Fetching Account Info", description: "Retrieving account information", weight: 10 },
        { name: "Analyzing Trade History", description: "Scanning for new trades", weight: 20 },
        { name: "Downloading Trades", description: "Retrieving trade data", weight: 25 },
        { name: "Processing Data", description: "Validating and formatting trades", weight: 10 },
        { name: "Saving to Database", description: "Storing trades securely", weight: 10 },
      ];

      const syncId = await syncProgressTracker.startSync(options.userId, accountId, syncSteps, {
        canCancel: true,
        metadata: { accountName: credentials.name },
      });

      await syncProgressTracker.updateProgress(syncId, {
        currentStep: "Connecting to MT5",
        currentStepIndex: 0,
        message: "Establishing connection to MetaTrader 5...",
        progress: 5,
      });

      const payload = {
        server: credentials.server,
        login: credentials.login,
        password: credentials.password,
        from_ts: options.fromDate ? new Date(options.fromDate).toISOString() : undefined,
        to_ts: options.toDate ? new Date(options.toDate).toISOString() : undefined,
        sync_id: syncId,
      };

      const response = await fetch(`${this.backendUrl}/sync_mt5`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        await syncProgressTracker.completeSync(syncId, { errorMessage: error.detail || "Sync failed" });
        return { success: false, error: error.detail || "Sync failed" };
      }

      const result = await response.json();

      const importResult = await this.importTradesToTradia(result.trades || [], result.account || {}, syncId, options.userId);

      await syncProgressTracker.completeSync(syncId, {
        totalTrades: importResult.totalTrades,
        newTrades: importResult.newTrades,
        updatedTrades: importResult.updatedTrades,
        skippedTrades: importResult.skippedTrades,
      });

      return {
        success: true,
        syncId,
        totalTrades: importResult.totalTrades,
        newTrades: importResult.newTrades,
        updatedTrades: importResult.updatedTrades,
        skippedTrades: importResult.skippedTrades,
      };
    } catch (err) {
      console.error("syncTradeHistory error:", err);
      return { success: false, error: err instanceof Error ? err.message : "Sync failed" };
    }
  }

  private mapMT5ToTradiaTrade(mt5Trade: MT5TradeData): Partial<Trade> {
    const getDirection = (type: number): "Buy" | "Sell" => {
      if (type === 1) return "Sell";
      return "Buy";
    };

    const getOutcome = (profit: number): "Win" | "Loss" | "Breakeven" => {
      if (profit > 0) return "Win";
      if (profit < 0) return "Loss";
      return "Breakeven";
    };

    const durationMs = Math.max(0, (mt5Trade.time_close - mt5Trade.time_open) * 1000);
    const durationMinutes = Math.floor(durationMs / (1000 * 60));

    return {
      id: `MT5_${mt5Trade.ticket}`,
      symbol: mt5Trade.symbol,
      direction: getDirection(mt5Trade.type),
      orderType: "Market Execution",
      openTime: new Date(mt5Trade.time_open * 1000).toISOString(),
      closeTime: mt5Trade.time_close ? new Date(mt5Trade.time_close * 1000).toISOString() : undefined,
      lotSize: mt5Trade.volume,
      entryPrice: mt5Trade.price_open,
      exitPrice: mt5Trade.price_close ?? undefined,
      pnl: mt5Trade.profit,
      outcome: getOutcome(mt5Trade.profit),
      duration: `${durationMinutes} min`,
      journalNotes: mt5Trade.comment || "",
      resultRR: this.calculateRiskReward(mt5Trade),
      updated_at: new Date(),
    } as Partial<Trade>;
  }

  private calculateRiskReward(mt5Trade: MT5TradeData): number {
    const { price_open, price_close, profit } = mt5Trade;
    if (profit <= 0) return -1;
    const priceDiff = Math.abs((price_close ?? price_open) - price_open);
    if (priceDiff === 0) return 0;
    const assumedRisk = Math.abs(price_open) * 0.02 || 1;
    return priceDiff / assumedRisk;
  }

  private async importTradesToTradia(
    mt5Trades: MT5TradeData[],
    accountInfo: any,
    syncId: string,
    userId: string
  ): Promise<{ totalTrades: number; newTrades: number; updatedTrades: number; skippedTrades: number }> {
    let newTrades = 0;
    let updatedTrades = 0;
    let skippedTrades = 0;

    await syncProgressTracker.updateProgress(syncId, {
      currentStep: "Processing Data",
      currentStepIndex: 5,
      message: "Validating and formatting trades...",
      progress: 75,
      totalTrades: mt5Trades.length,
      processedTrades: 0,
    });

    for (let i = 0; i < mt5Trades.length; i++) {
      const mt5Trade = mt5Trades[i];
      const tradiaTrade = this.mapMT5ToTradiaTrade(mt5Trade);

      try {
        const response = await fetch("/api/trades/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trades: [tradiaTrade], source: "MT5", accountInfo, syncId }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          console.error(`Import failed for ticket ${mt5Trade.ticket}:`, err);
          skippedTrades++;
        } else {
          const result = await response.json().catch(() => ({}));
          newTrades += result.newTrades || 0;
          updatedTrades += result.updatedTrades || 0;
        }

        if ((i + 1) % 10 === 0 || i === mt5Trades.length - 1) {
          const progressPercent = 75 + Math.floor(((i + 1) / mt5Trades.length) * 20);
          await syncProgressTracker.updateProgress(syncId, {
            progress: Math.min(progressPercent, 95),
            processedTrades: i + 1,
            newTrades,
            updatedTrades,
            message: `Processing trade ${i + 1} of ${mt5Trades.length}...`,
          });
        }
      } catch (err) {
        console.error(`Error importing trade ${mt5Trade.ticket}:`, err);
        skippedTrades++;
      }
    }

    return { totalTrades: mt5Trades.length, newTrades, updatedTrades, skippedTrades };
  }

  private async storeCredentials(credentials: _MT5Credentials, accountInfo: any): Promise<string> {
    const accountId = `mt5_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const response = await fetch("/api/mt5/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: accountId, ...credentials, accountInfo, state: "connected" }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "Failed to store account credentials");
    }

    const result = await response.json().catch(() => ({}));
    return result.account?.id || accountId;
  }

  private async getStoredCredentials(accountId: string): Promise<_MT5Credentials | null> {
    try {
      const response = await fetch(`/api/mt5/accounts/${encodeURIComponent(accountId)}`);
      if (!response.ok) {
        console.error("Failed to retrieve account:", response.status);
        return null;
      }
      const data = await response.json().catch(() => ({}));
      const account = data.account || data;
      if (!account || !account.server || !account.login) {
        console.error("Invalid account data:", account);
        return null;
      }
      return { server: account.server, login: account.login, password: account.password, name: account.name };
    } catch (err) {
      console.error("getStoredCredentials error:", err);
      return null;
    }
  }

  async getUserAccounts(userId?: string): Promise<any[]> {
    try {
      const response = await fetch("/api/mt5/accounts");
      if (!response.ok) {
        console.error("Failed to get accounts:", response.status);
        return [];
      }
      const data = await response.json().catch(() => ({}));
      return data.accounts || [];
    } catch (err) {
      console.error("getUserAccounts error:", err);
      return [];
    }
  }

  async testConnection(credentials: _MT5Credentials): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.backendUrl}/test_connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return { success: false, error: error.detail || "Connection test failed" };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Connection test failed" };
    }
  }
}

/* singleton export */
export const mt5Integration = MT5IntegrationService.getInstance();
