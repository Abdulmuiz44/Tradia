// src/components/mt5/MT5IntegrationWizard.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  mt5Integration,
  type MT5Credentials,
  type MT5ConnectionResult,
  type MT5SyncResult,
} from "@/lib/mt5-integration";
import SyncProgressComponent from "./SyncProgress";
import { default as MonitoringWidget } from "./MonitoringWidget";
import RequirementsGuide from "./RequirementsGuide";
import {
  getUserPlan,
  canAccessMT5,
  getMT5AccountLimit,
  type PlanType,
} from "@/lib/planAccess";
import UpgradePrompt, { CompactUpgradePrompt } from "@/components/UpgradePrompt";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Database,
  RefreshCw,
  Plus,
  Wifi,
  WifiOff,
  X,
  Activity,
  Info,
  Shield,
  Crown,
} from "lucide-react";

interface MT5Account {
  id: string;
  server: string;
  login: string;
  name: string;
  state: "connected" | "disconnected" | "error";
  lastSync?: string;
  balance?: number | null;
  currency?: string;
}

interface MT5IntegrationWizardProps {
  userId?: string;
  compact?: boolean;
  className?: string;
}

export default function MT5IntegrationWizard({
  userId,
  compact = false,
  className = "",
}: MT5IntegrationWizardProps): React.ReactElement | null {
  const [accounts, setAccounts] = useState<MT5Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);
  const [syncProgressId, setSyncProgressId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRequirements, setShowRequirements] = useState(false);
  const [accountLimits, setAccountLimits] = useState<
    { canAdd: boolean; currentCount: number; limit: number; plan: any } | null
  >(null);

  // Plan-related state
  const [userPlan, setUserPlan] = useState<PlanType | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  useEffect(() => {
    if (userId) {
      loadUserPlan();
      loadAccounts();
      loadAccountLimits();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadUserPlan = async () => {
    if (!userId) return;

    try {
      setPlanLoading(true);
      const response = await fetch("/api/user/plan");
      if (response.ok) {
        const data = await response.json();
        setUserPlan(data.plan);
      } else {
        console.error("Failed to load user plan:", response.statusText);
        setUserPlan("free" as PlanType);
      }
    } catch (err) {
      console.error("Failed to load user plan:", err);
      setUserPlan("free" as PlanType);
    } finally {
      setPlanLoading(false);
    }
  };

  const loadAccountLimits = async () => {
    if (!userId) return;

    try {
      const limits = await mt5Integration.checkAccountLimits(userId);
      setAccountLimits(limits);
    } catch (err) {
      console.error("Failed to load account limits:", err);
    }
  };

  const loadAccounts = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const userAccounts = await mt5Integration.getUserAccounts(userId);
      setAccounts(userAccounts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (credentials: MT5Credentials) => {
    try {
      setLoading(true);
      setError(null);

      const result: MT5ConnectionResult = await mt5Integration.connectAccount(
        credentials,
        userId
      );

      if (result.success) {
        setShowConnectForm(false);
        await loadAccounts();
      } else {
        setError(result.error || "Connection failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (accountId: string) => {
    if (!userId) return;

    try {
      setSyncingAccountId(accountId);
      setError(null);

      const result: MT5SyncResult = await mt5Integration.syncTradeHistory(
        accountId,
        {
          userId,
          fromDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
          toDate: new Date(),
        }
      );

      if (result.success) {
        setSyncProgressId(result.syncId || null);
        await loadAccounts();
      } else {
        setError(result.error || "Sync failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncingAccountId(null);
    }
  };

  const getStatusIcon = (state: string) => {
    switch (state) {
      case "connected":
        return <Wifi className="w-4 h-4 text-green-500" />;
      case "error":
        return <WifiOff className="w-4 h-4 text-red-500" />;
      default:
        return <WifiOff className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (state: string) => {
    switch (state) {
      case "connected":
        return "text-green-600";
      case "error":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  // Compact view
  if (compact) {
    if (planLoading) {
      return (
        <div
          className={`flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg ${className}`}
        >
          <Database className="w-5 h-5 text-blue-500" />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">MT5 Integration</div>
            <div className="text-xs text-gray-600">Loading...</div>
          </div>
        </div>
      );
    }

    const hasMT5Access = userPlan
      ? canAccessMT5({ type: userPlan, isActive: true, features: [] })
      : false;
    const connectedCount = accounts.filter((acc) => acc.state === "connected").length;
    const accountLimit = userPlan
      ? getMT5AccountLimit({ type: userPlan, isActive: true, features: [] })
      : 0;

    if (!hasMT5Access) {
      return (
        <div className={className}>
          <CompactUpgradePrompt
            currentPlan={(userPlan as any) || "free"}
            feature="MT5 account connections"
            onUpgrade={(plan) => {
              console.log("Upgrading to:", plan);
              setShowUpgradePrompt(true);
            }}
          />
        </div>
      );
    }

    return (
      <div
        className={`flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg ${className}`}
      >
        <Database className="w-5 h-5 text-blue-500" />
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-900">MT5 Integration</div>
          <div className="text-xs text-gray-600">
            {connectedCount}/{accountLimit === -1 ? "∞" : accountLimit} accounts connected
          </div>
        </div>
        {connectedCount < accountLimit || accountLimit === -1 ? (
          <button
            onClick={() => setShowConnectForm(true)}
            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          >
            {connectedCount > 0 ? "Add Account" : "Connect MT5"}
          </button>
        ) : (
          <div className="text-xs text-gray-500">Limit reached</div>
        )}
      </div>
    );
  }

  // Full view
  return (
    <div className={`space-y-6 ${className}`}>
      {planLoading && (
        <div className="flex items-center justify-center p-8">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mr-2" />
          <span className="text-gray-600">Loading your plan...</span>
        </div>
      )}

      {!planLoading && userPlan && !canAccessMT5({ type: userPlan, isActive: true, features: [] }) && (
        <CompactUpgradePrompt
          currentPlan={userPlan}
          feature="MT5 account connections and trade synchronization"
          onUpgrade={(plan) => setShowUpgradePrompt(true)}
        />
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-blue-500" />
          <div>
            <h2 className="text-xl font-semibold text-white">MT5 Integration</h2>
            <p className="text-sm text-gray-400">
              Connect your MetaTrader 5 accounts and sync trade history
              {userPlan && (
                <span className="block text-xs mt-1">
                  Current Plan: <span className="font-medium capitalize">{userPlan}</span>
                  {canAccessMT5({ type: userPlan, isActive: true, features: [] }) && (
                    <span className="text-green-400 ml-2">✓ Premium Feature</span>
                  )}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {accountLimits && (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg">
              <Shield className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-300">
                {accountLimits.currentCount}/{accountLimits.limit === -1 ? "∞" : accountLimits.limit} accounts
              </span>
              {!accountLimits.canAdd && (
                <span className="text-xs text-yellow-400 bg-yellow-900/50 px-2 py-1 rounded">
                  Limit reached
                </span>
              )}
            </div>
          )}

          <button
            onClick={() => setShowRequirements(true)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
            data-track="mt5_requirements_open"
          >
            <Info className="w-4 h-4" />
            Requirements
          </button>

          {userPlan && canAccessMT5({ type: userPlan, isActive: true, features: [] }) ? (
            <button
              onClick={() => {
                const accountLimit = getMT5AccountLimit({ type: userPlan, isActive: true, features: [] });
                const currentCount = accounts.length;

                if (accountLimit !== -1 && currentCount >= accountLimit) {
                  setShowUpgradePrompt(true);
                } else {
                  setShowConnectForm(true);
                }
              }}
              disabled={accountLimits ? !accountLimits.canAdd : false}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
              data-track="mt5_add_account_open"
            >
              <Plus className="w-4 h-4" />
              Add MT5 Account
            </button>
          ) : (
            <button
              onClick={() => setShowUpgradePrompt(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700"
              data-track="mt5_upgrade_click"
            >
              <Crown className="w-4 h-4" />
              Upgrade for MT5 Access
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-sm text-red-400 font-medium">Error</span>
          </div>
          <p className="text-sm text-red-300 mt-1">{error}</p>
        </div>
      )}

      {syncProgressId && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <SyncProgressComponent syncId={syncProgressId} compact={false} />
        </div>
      )}

      {accounts.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Connected Accounts</h3>

          {accounts.map((account) => (
            <div key={account.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(account.state)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{account.name || `MT5 ${account.login}`}</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          account.state === "connected"
                            ? "bg-green-900/50 text-green-300 border border-green-700"
                            : account.state === "error"
                            ? "bg-red-900/50 text-red-300 border border-red-700"
                            : "bg-gray-900/50 text-gray-300 border border-gray-600"
                        }`}
                      >
                        {account.state}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400">
                      {account.login} @ {account.server}
                    </div>
                    {account.lastSync && (
                      <div className="text-xs text-gray-500">
                        Last sync: {new Date(account.lastSync).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {account.balance !== undefined && account.balance !== null && (
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {account.currency} {Number(account.balance).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-600">Balance</div>
                    </div>
                  )}

                  <button
                    onClick={() => handleSync(account.id)}
                    disabled={syncingAccountId === account.id || account.state !== "connected"}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {syncingAccountId === account.id ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3" />
                        Sync Now
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-800/30 rounded-lg border-2 border-dashed border-gray-600">
          <Database className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No MT5 Accounts Connected</h3>
          <p className="text-gray-400 mb-6">
            Connect your MetaTrader 5 account to start syncing your trade history and performance data.
          </p>
          <button
            onClick={() => setShowConnectForm(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Database className="w-5 h-5" />
            Connect MT5 Account
          </button>
        </div>
      )}

      {accounts.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-6 h-6 text-blue-500" />
            <div>
              <h3 className="text-lg font-semibold text-white">Sync Monitoring</h3>
              <p className="text-sm text-gray-400">Monitor your MT5 sync performance and connection health</p>
            </div>
          </div>

          <MonitoringWidget userId={userId} compact={false} className="bg-gray-800/50 border border-gray-700 rounded-lg" />
        </div>
      )}

      {showConnectForm && (
        <MT5ConnectionModal onConnect={handleConnect} onClose={() => setShowConnectForm(false)} loading={loading} />
      )}

      {showRequirements && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowRequirements(false)} />

          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <RequirementsGuide requirements={mt5Integration.getRequirements()} onClose={() => setShowRequirements(false)} />
          </div>
        </div>
      )}

      {showUpgradePrompt && userPlan && (
        <UpgradePrompt
          currentPlan={userPlan}
          feature="Broker integrations"
          onUpgrade={(plan) => {
            console.log("Upgrading to:", plan);
            setShowUpgradePrompt(false);
          }}
          onClose={() => setShowUpgradePrompt(false)}
        />
      )}
    </div>
  );
}

/**
 * MT5 Connection Modal Component (kept inline for convenience)
 */
interface MT5ConnectionModalProps {
  onConnect: (credentials: MT5Credentials) => Promise<void>;
  onClose: () => void;
  loading: boolean;
}

function MT5ConnectionModal({ onConnect, onClose, loading }: MT5ConnectionModalProps) {
  const [credentials, setCredentials] = useState<MT5Credentials>({
    server: "",
    login: "",
    password: "",
    name: "",
  });
  const [broker, setBroker] = useState<string>("");
  const [platform, setPlatform] = useState<string>("MT5");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = mt5Integration.validateCredentials(credentials);
    setValidationErrors(validation.errors ?? []);

    if (!validation.valid) {
      return;
    }

    setTestResult(null);
    await onConnect(credentials);
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);

      const result = await mt5Integration.testConnection(credentials);

      setTestResult({
        success: !!result?.success,
        message: result?.success ? "Connection successful!" : result?.error || "Connection failed",
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "Connection test failed",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-md bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Connect Broker Account</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded" data-track="mt5_connect_close">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Broker</label>
              <select
                value={broker}
                onChange={(e) => {
                  const val = e.target.value;
                  setBroker(val);
                  // Hint common server strings when broker is selected
                  const presets: Record<string, string> = {
                    Exness: "Exness-MT5",
                    "IC Markets": "ICMarketsSC-MT5",
                    XM: "XMGlobal-MT5",
                    HotForex: "HFMarketsSV-MT5",
                    OctaFX: "OctaFX-Real",
                  };
                  if (!credentials.server && presets[val]) {
                    setCredentials((prev) => ({ ...prev, server: presets[val] }));
                  }
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select broker</option>
                <option>Exness</option>
                <option>IC Markets</option>
                <option>XM</option>
                <option>HotForex</option>
                <option>OctaFX</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option>MT5</option>
                <option disabled>MT4 (coming soon)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Broker Server</label>
            <input
              type="text"
              value={credentials.server}
              onChange={(e) => setCredentials((prev) => ({ ...prev, server: e.target.value }))}
              placeholder={broker ? `e.g., ${credentials.server || broker}` : "e.g., ICMarketsSC-MT5"}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Login</label>
            <input
              type="text"
              value={credentials.login}
              onChange={(e) => setCredentials((prev) => ({ ...prev, login: e.target.value }))}
              placeholder="Account number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Account password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Name (Optional)</label>
            <input
              type="text"
              value={credentials.name}
              onChange={(e) => setCredentials((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Live Account"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !credentials.server || !credentials.login || !credentials.password}
              className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              data-track="mt5_test_connection"
            >
              {testing ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Wifi className="w-3 h-3" />
                  Test Connection
                </>
              )}
            </button>
          </div>

          {validationErrors.length > 0 && (
            <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-red-400">Please fix the following issues:</span>
              </div>
              <ul className="text-sm text-red-300 space-y-1">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>• {err}</li>
                ))}
              </ul>
            </div>
          )}

          {testResult && (
            <div className={`p-3 rounded-lg ${testResult.success ? "bg-green-900/20 border border-green-700" : "bg-red-900/20 border border-red-700"}`}>
              <div className="flex items-center gap-2">
                {testResult.success ? <CheckCircle className="w-4 h-4 text-green-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                <span className={`text-sm font-medium ${testResult.success ? "text-green-300" : "text-red-300"}`}>{testResult.message}</span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 text-gray-300" data-track="mt5_connect_cancel">Cancel</button>
            <button
              type="submit"
              disabled={loading || !credentials.server || !credentials.login || !credentials.password}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              data-track="mt5_connect_account"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Database className="w-3 h-3" />
                  Connect Account
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
