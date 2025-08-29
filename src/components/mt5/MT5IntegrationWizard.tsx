// src/components/mt5/MT5IntegrationWizard.tsx
"use client";

import React, { useState, useEffect } from "react";
import { mt5Integration, MT5Credentials, MT5ConnectionResult, MT5SyncResult } from "@/lib/mt5-integration";
import SyncProgressComponent from "./SyncProgress";
import MonitoringWidget from "./MonitoringWidget";
import RequirementsGuide from "./RequirementsGuide";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Database,
  RefreshCw,
  Plus,
  Settings,
  TrendingUp,
  Wifi,
  WifiOff,
  ArrowRight,
  X,
  Activity,
  BarChart2,
  Info,
  Shield
} from "lucide-react";

interface MT5Account {
  id: string;
  server: string;
  login: string;
  name: string;
  state: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  balance?: number;
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
  className = ""
}: MT5IntegrationWizardProps) {
  const [accounts, setAccounts] = useState<MT5Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);
  const [syncProgressId, setSyncProgressId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRequirements, setShowRequirements] = useState(false);
  const [accountLimits, setAccountLimits] = useState<{ canAdd: boolean; currentCount: number; limit: number; plan: any } | null>(null);

  // Load user's MT5 accounts and limits
  useEffect(() => {
    if (userId) {
      loadAccounts();
      loadAccountLimits();
    }
  }, [userId]);

  const loadAccountLimits = async () => {
    if (!userId) return;

    try {
      const limits = await mt5Integration.checkAccountLimits(userId);
      setAccountLimits(limits);
    } catch (err) {
      console.error('Failed to load account limits:', err);
    }
  };

  const loadAccounts = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const userAccounts = await mt5Integration.getUserAccounts(userId);
      setAccounts(userAccounts);
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

      const result: MT5ConnectionResult = await mt5Integration.connectAccount(credentials);

      if (result.success) {
        setShowConnectForm(false);
        await loadAccounts(); // Refresh accounts list
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
          toDate: new Date()
        }
      );

      if (result.success) {
        setSyncProgressId(result.syncId || null);
        await loadAccounts(); // Refresh account status
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
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'error':
        return <WifiOff className="w-4 h-4 text-red-500" />;
      default:
        return <WifiOff className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'connected':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  // Compact view
  if (compact) {
    const connectedCount = accounts.filter(acc => acc.state === 'connected').length;

    return (
      <div className={`flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg ${className}`}>
        <Database className="w-5 h-5 text-blue-500" />
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-900">
            MT5 Integration
          </div>
          <div className="text-xs text-gray-600">
            {connectedCount} account{connectedCount !== 1 ? 's' : ''} connected
          </div>
        </div>
        <button
          onClick={() => setShowConnectForm(true)}
          className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
        >
          {connectedCount > 0 ? 'Add Account' : 'Connect MT5'}
        </button>
      </div>
    );
  }

  // Full view
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-blue-500" />
          <div>
            <h2 className="text-xl font-semibold text-white">MT5 Integration</h2>
            <p className="text-sm text-gray-400">
              Connect your MetaTrader 5 accounts and sync trade history
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Account Limits Info */}
          {accountLimits && (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg">
              <Shield className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-300">
                {accountLimits.currentCount}/{accountLimits.limit === -1 ? '∞' : accountLimits.limit} accounts
              </span>
              {!accountLimits.canAdd && (
                <span className="text-xs text-yellow-400 bg-yellow-900/50 px-2 py-1 rounded">
                  Limit reached
                </span>
              )}
            </div>
          )}

          {/* Requirements Button */}
          <button
            onClick={() => setShowRequirements(true)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
          >
            <Info className="w-4 h-4" />
            Requirements
          </button>

          {/* Add Account Button */}
          <button
            onClick={() => setShowConnectForm(true)}
            disabled={accountLimits ? !accountLimits.canAdd : false}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Add MT5 Account
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-sm text-red-400 font-medium">Error</span>
          </div>
          <p className="text-sm text-red-300 mt-1">{error}</p>
        </div>
      )}

      {/* Progress Display */}
      {syncProgressId && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <SyncProgressComponent
            syncId={syncProgressId}
            compact={false}
          />
        </div>
      )}

      {/* Accounts List */}
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
                      <span className="font-medium text-white">
                        {account.name || `MT5 ${account.login}`}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        account.state === 'connected'
                          ? 'bg-green-900/50 text-green-300 border border-green-700'
                          : account.state === 'error'
                          ? 'bg-red-900/50 text-red-300 border border-red-700'
                          : 'bg-gray-900/50 text-gray-300 border border-gray-600'
                      }`}>
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
                  {account.balance && (
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {account.currency} {account.balance.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-600">Balance</div>
                    </div>
                  )}

                  <button
                    onClick={() => handleSync(account.id)}
                    disabled={syncingAccountId === account.id || account.state !== 'connected'}
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
        /* Empty State */
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

      {/* Monitoring Section */}
      {accounts.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-6 h-6 text-blue-500" />
            <div>
              <h3 className="text-lg font-semibold text-white">Sync Monitoring</h3>
              <p className="text-sm text-gray-400">
                Monitor your MT5 sync performance and connection health
              </p>
            </div>
          </div>

          <MonitoringWidget
            userId={userId}
            compact={false}
            className="bg-gray-800/50 border border-gray-700 rounded-lg"
          />
        </div>
      )}

      {/* Connection Form Modal */}
      {showConnectForm && (
        <MT5ConnectionModal
          onConnect={handleConnect}
          onClose={() => setShowConnectForm(false)}
          loading={loading}
        />
      )}

      {/* Requirements Guide Modal */}
      {showRequirements && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowRequirements(false)} />

          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <RequirementsGuide
              requirements={mt5Integration.getRequirements()}
              onClose={() => setShowRequirements(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * MT5 Connection Modal Component
 */
interface MT5ConnectionModalProps {
  onConnect: (credentials: MT5Credentials) => Promise<void>;
  onClose: () => void;
  loading: boolean;
}

function MT5ConnectionModal({ onConnect, onClose, loading }: MT5ConnectionModalProps) {
  const [credentials, setCredentials] = useState<MT5Credentials>({
    server: '',
    login: '',
    password: '',
    name: ''
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate credentials before submitting
    const validation = mt5Integration.validateCredentials(credentials);
    setValidationErrors(validation.errors);

    if (!validation.valid) {
      return;
    }

    // Clear any previous test results
    setTestResult(null);

    await onConnect(credentials);
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);

      const result = await mt5Integration.testConnection(credentials);

      setTestResult({
        success: result.success,
        message: result.success ? 'Connection successful!' : (result.error || 'Connection failed')
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Connection test failed'
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
          <h3 className="text-lg font-semibold text-white">Connect MT5 Account</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Broker Server
            </label>
            <input
              type="text"
              value={credentials.server}
              onChange={(e) => setCredentials(prev => ({ ...prev, server: e.target.value }))}
              placeholder="e.g., ICMarketsSC-MT5"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Login
            </label>
            <input
              type="text"
              value={credentials.login}
              onChange={(e) => setCredentials(prev => ({ ...prev, login: e.target.value }))}
              placeholder="Account number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Account password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Name (Optional)
            </label>
            <input
              type="text"
              value={credentials.name}
              onChange={(e) => setCredentials(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Live Account"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Test Connection */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !credentials.server || !credentials.login || !credentials.password}
              className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-red-400">Please fix the following issues:</span>
              </div>
              <ul className="text-sm text-red-300 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Test Result */}
          {testResult && (
            <div className={`p-3 rounded-lg ${
              testResult.success
                ? 'bg-green-900/20 border border-green-700'
                : 'bg-red-900/20 border border-red-700'
            }`}>
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
                <span className={`text-sm font-medium ${
                  testResult.success ? 'text-green-300' : 'text-red-300'
                }`}>
                  {testResult.message}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !credentials.server || !credentials.login || !credentials.password}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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