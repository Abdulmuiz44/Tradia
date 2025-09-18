"use client";

import React, { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import ConnectionStatusComponent from "@/components/mt5/ConnectionStatus";
import SyncProgressComponent, { SyncProgressMini } from "@/components/mt5/SyncProgress";
import { syncProgressTracker } from "@/lib/sync-progress";
import { ArrowLeft, RefreshCw, CheckCircle, AlertCircle, Loader2, Database } from "lucide-react";
import Link from "next/link";

interface brokerAccount {
  id: string;
  server: string;
  login: string;
  name: string;
  state: string;
  last_connected_at?: string;
}

export default function brokerSyncPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<brokerAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
    imported?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [currentSyncId, setCurrentSyncId] = useState<string | null>(null);
  const [showProgress, setShowProgress] = useState(false);

  // Load user's broker accounts
  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setAccountsLoading(true);
      const res = await fetch("/api/mt5/accounts");

      if (!res.ok) {
        throw new Error(`Failed to load accounts (${res.status})`);
      }

      const data = await res.json();
      const accountsList = Array.isArray(data.accounts) ? data.accounts : [];

      setAccounts(accountsList);

      // Auto-select the first connected account
      const connectedAccount = accountsList.find((acc: brokerAccount) => acc.state === 'connected');
      if (connectedAccount) {
        setSelectedAccountId(connectedAccount.id);
      }
    } catch (err) {
      console.error("Failed to load broker accounts:", err);
      setError(err instanceof Error ? err.message : "Failed to load accounts");
    } finally {
      setAccountsLoading(false);
    }
  };

  const sync = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedAccountId) {
      setError("Please select an broker account to sync");
      return;
    }

    setError(null);
    setSyncResult(null);
    setSyncing(true);
    setShowProgress(true);

    // Get user ID (we'll need this for progress tracking)
    let userId: string;
    try {
      const userRes = await fetch("/api/auth/session");
      const userData = await userRes.json();
      userId = userData?.user?.id;

      if (!userId) {
        throw new Error("Unable to identify user session");
      }
    } catch (err) {
      setError("Authentication error. Please refresh and try again.");
      setSyncing(false);
      setShowProgress(false);
      return;
    }

    // Define sync steps for progress tracking
    const syncSteps = [
      { name: "Connecting to broker", description: "Establishing connection to your broker", weight: 15 },
      { name: "Authenticating", description: "Verifying account credentials", weight: 10 },
      { name: "Fetching Account Info", description: "Retrieving account information", weight: 10 },
      { name: "Analyzing Trade History", description: "Scanning for new trades", weight: 20 },
      { name: "Downloading Trades", description: "Retrieving trade data", weight: 25 },
      { name: "Processing Data", description: "Validating and formatting trades", weight: 10 },
      { name: "Saving to Database", description: "Storing trades securely", weight: 10 }
    ];

    let syncId: string | null = null;

    try {
      // Start progress tracking
      syncId = await syncProgressTracker.startSync(
        userId,
        selectedAccountId,
        syncSteps,
        { canCancel: true, metadata: { accountName: selectedAccount?.name } }
      );

      setCurrentSyncId(syncId);

      // Update progress: Connecting
      await syncProgressTracker.updateProgress(syncId, {
        currentStep: "Connecting to broker",
        currentStepIndex: 0,
        message: "Establishing connection to your broker...",
        progress: 5
      });

      // Make the sync API call
      const res = await fetch("/api/mt5/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brokerAccountId: selectedAccountId,
          from: undefined, // Will sync last 90 days by default
          to: undefined,
          syncId: syncId
        }),
      });

      // Update progress: Authenticating
      await syncProgressTracker.updateProgress(syncId, {
        currentStep: "Authenticating",
        currentStepIndex: 1,
        message: "Verifying account credentials...",
        progress: 20
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Sync failed (${res.status})`);
      }

      // Update progress: Processing
      await syncProgressTracker.updateProgress(syncId, {
        currentStep: "Processing Data",
        currentStepIndex: 5,
        message: "Validating and formatting trades...",
        progress: 80,
        totalTrades: data.totalTrades || 0,
        processedTrades: data.processedTrades || 0,
        newTrades: data.newTrades || 0,
        updatedTrades: data.updatedTrades || 0
      });

      // Update progress: Saving
      await syncProgressTracker.updateProgress(syncId, {
        currentStep: "Saving to Database",
        currentStepIndex: 6,
        message: "Storing trades securely...",
        progress: 95
      });

      const imported = typeof data.imported === "number" ? data.imported : 0;

      // Complete the sync
      await syncProgressTracker.completeSync(syncId, {
        totalTrades: data.totalTrades || imported,
        newTrades: data.newTrades || imported,
        updatedTrades: data.updatedTrades || 0,
        skippedTrades: data.skippedTrades || 0
      });

      const newTrades = typeof data.newTrades === "number" ? data.newTrades : 0;
      const updatedTrades = typeof data.updatedTrades === "number" ? data.updatedTrades : 0;

      setSyncResult({
        success: true,
        message: `Successfully synced ${imported} trades (${newTrades} new, ${updatedTrades} updated)`,
        imported
      });

      // Redirect to dashboard after successful sync
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      // Mark sync as failed
      if (syncId) {
        await syncProgressTracker.completeSync(syncId, {
          errorMessage: message
        });
      }

      setSyncResult({
        success: false,
        message: message
      });
    } finally {
      setSyncing(false);
      // Keep progress visible for a bit after completion
      setTimeout(() => {
        setShowProgress(false);
        setCurrentSyncId(null);
      }, 5000);
    }
  };

  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sync Broker Trades</h1>
              <p className="text-sm text-gray-600">Import your latest trading data from your broker</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress Display */}
        {showProgress && currentSyncId && (
          <div className="mb-8">
            <SyncProgressComponent
              syncId={currentSyncId}
              compact={false}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              {accountsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-600">Loading accounts...</span>
                </div>
              ) : accounts.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Broker Accounts Connected</h3>
                  <p className="text-gray-600 mb-4">
                    You need to connect an broker account before you can sync trades.
                  </p>
                  <Link
                    href="/dashboard/broker/connect"
                    className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                  >
                    Connect broker account
                  </Link>
                </div>
              ) : (
                <form onSubmit={sync} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Select broker account
                    </label>
                    <div className="space-y-3">
                      {accounts.map((account) => (
                        <div
                          key={account.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedAccountId === account.id
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedAccountId(account.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">
                                {account.name}
                              </div>
                              <div className="text-sm text-gray-600">
                                {account.login} @ {account.server}
                              </div>
                              {account.last_connected_at && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Last connected: {new Date(account.last_connected_at).toLocaleString()}
                                </div>
                              )}
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                              account.state === 'connected'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {account.state}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Error Display */}
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <span className="text-sm text-red-700 font-medium">Error</span>
                      </div>
                      <p className="text-sm text-red-600 mt-1">{error}</p>
                    </div>
                  )}

                  {/* Sync Result */}
                  {syncResult && (
                    <div className={`p-4 border rounded-lg ${
                      syncResult.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        {syncResult.success ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        )}
                        <span className={`text-sm font-medium ${
                          syncResult.success ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {syncResult.success ? 'Sync Successful' : 'Sync Failed'}
                        </span>
                      </div>
                      <p className={`text-sm mt-1 ${
                        syncResult.success ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {syncResult.message}
                      </p>
                      {syncResult.success && syncResult.imported !== undefined && (
                        <p className="text-xs text-green-600 mt-1">
                          Imported {syncResult.imported} trades • Redirecting to dashboard...
                        </p>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={syncing || !selectedAccountId}
                      className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {syncing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Syncing Trades...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          Sync Latest Trades
                        </>
                      )}
                    </button>

                    <Link
                      href="/dashboard/mt5/connect"
                      className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                    >
                      <Database className="w-4 h-4" />
                      Add Account
                    </Link>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Status Sidebar */}
          <div className="space-y-6">
            {/* Selected Account Status */}
            {selectedAccount && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Account Status</h3>
                <ConnectionStatusComponent
                  credentials={{
                    server: selectedAccount.server,
                    login: selectedAccount.login,
                    password: "", // We don't store passwords in the frontend
                    name: selectedAccount.name
                  }}
                  showDetails={true}
                />
              </div>
            )}

            {/* Sync Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Sync Information</h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• Syncs trades from the last 90 days by default</p>
                <p>• Only imports new trades since last sync</p>
                <p>• Your data is encrypted and secure</p>
                <p>• Sync process may take a few minutes</p>
              </div>
            </div>

            {/* Help Card */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Need Help?</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• Make sure broker terminal is running</p>
                <p>• Check your internet connection</p>
                <p>• Verify account credentials are correct</p>
                <p>• Contact support if issues persist</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
