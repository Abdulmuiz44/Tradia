"use client";

import React, { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MT5Credentials, ConnectionError } from "@/types/mt5";
import { mt5ConnectionManager } from "@/lib/mt5-connection-manager";
import ConnectionStatusComponent, { useConnectionStatus } from "@/components/mt5/ConnectionStatus";
import ErrorRecoveryComponent, { QuickErrorRecovery } from "@/components/mt5/ErrorRecovery";
import { ArrowLeft, CheckCircle, AlertCircle, Loader2, Info } from "lucide-react";
import Link from "next/link";

type ConnectForm = {
  server: string;
  login: string;
  investorPassword: string;
  name: string;
};

export default function MT5ConnectPage() {
  const router = useRouter();
  const [form, setForm] = useState<ConnectForm>({
    server: "",
    login: "",
    investorPassword: "",
    name: "",
  });

  const [isValidating, setIsValidating] = useState(false);
  const [validationComplete, setValidationComplete] = useState(false);
  const [validationSuccess, setValidationSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentErrorType, setCurrentErrorType] = useState<ConnectionError | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [savingCredential, setSavingCredential] = useState(false);

  // Get connection status for current form data
  const connectionState = useConnectionStatus({
    server: form.server,
    login: form.login,
    password: form.investorPassword,
    name: form.name || undefined
  });

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    // Reset validation state when form changes
    if (validationComplete) {
      setValidationComplete(false);
      setValidationSuccess(false);
      setError(null);
    }
  };

  const validateConnection = async () => {
    if (!form.server || !form.login || !form.investorPassword) {
      setError("Please fill in all required fields");
      setCurrentErrorType(null);
      return;
    }

    setIsValidating(true);
    setError(null);
    setCurrentErrorType(null);
    setValidationComplete(false);
    setShowRecovery(false);

    try {
      const credentials: MT5Credentials = {
        server: form.server.trim(),
        login: form.login.trim(),
        investorPassword: form.investorPassword,
        name: form.name.trim() || undefined,
        password: form.investorPassword
      };

      // Set validation timeout
      mt5ConnectionManager.setValidationTimeout(credentials);

      // Use retry mechanism with custom config
      const result = await mt5ConnectionManager.validateConnection(credentials, {
        maxAttempts: 3,
        initialDelay: 2000, // Start with 2 second delay
        maxDelay: 10000, // Max 10 seconds between retries
        backoffMultiplier: 1.5,
        retryableErrors: ['network_error', 'timeout', 'server_unreachable']
      });

      setValidationComplete(true);
      setValidationSuccess(result.isValid);

      if (result.isValid) {
        // Success - show save prompt
        console.log("MT5 connection validated successfully", result.accountInfo);
        setShowRecovery(false);
        setShowSavePrompt(true);
      } else {
        // Extract error type from result
        const errorType = result.error || 'unknown';
        setCurrentErrorType(errorType as ConnectionError);
        setError(result.errorMessage || "Connection validation failed");
        setShowRecovery(true);
        setShowSavePrompt(false);
      }

    } catch (err) {
      setValidationComplete(true);
      setValidationSuccess(false);
      setCurrentErrorType('unknown');
      setError(err instanceof Error ? err.message : "Validation failed");
      setShowRecovery(true);
    } finally {
      setIsValidating(false);
      mt5ConnectionManager.clearValidationTimeout({
        server: form.server,
        login: form.login,
        password: form.investorPassword
      });
    }
  };

  const handleRetry = () => {
    validateConnection();
  };

  const dismissRecovery = () => {
    setShowRecovery(false);
  };

  const handleSaveCredential = async () => {
    setSavingCredential(true);
    setError(null);

    try {
      const response = await fetch("/api/mt5/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to save credential");
      }

      const data = await response.json();

      // Success - redirect to sync page
      router.push("/dashboard/mt5/sync");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save credential");
      setShowSavePrompt(false);
    } finally {
      setSavingCredential(false);
    }
  };

  const handleSkipSave = () => {
    setShowSavePrompt(false);
    // Could redirect to sync or just continue with validation success
    router.push("/dashboard/mt5/sync");
  };

  const saveConnection = async () => {
    if (!validationSuccess) return;

    try {
      const res = await fetch("/api/mt5/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to save connection (${res.status})`);
      }

      // Success - redirect to sync page or dashboard
      router.push("/dashboard/mt5/sync");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save connection");
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validationComplete) {
      await validateConnection();
    } else if (validationSuccess) {
      await saveConnection();
    }
  };

  // Auto-validate when all required fields are filled
  useEffect(() => {
    const hasRequiredFields = form.server && form.login && form.investorPassword;

    if (hasRequiredFields && !validationComplete && !isValidating) {
      const timeoutId = setTimeout(() => {
        validateConnection();
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [form.server, form.login, form.investorPassword]);

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
              <h1 className="text-2xl font-bold text-gray-900">Connect MT5 Account</h1>
              <p className="text-sm text-gray-600">Link your MetaTrader 5 account to sync your trading data</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Server Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Broker Server *
                  </label>
                  <input
                    name="server"
                    placeholder="e.g. ICMarketsSC-MT5, Pepperstone-MT5"
                    onChange={onChange}
                    value={form.server}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Find this in your MT5 terminal under File → Open Account
                  </p>
                </div>

                {/* Login Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Login *
                  </label>
                  <input
                    name="login"
                    type="number"
                    placeholder="e.g. 12345678"
                    onChange={onChange}
                    value={form.login}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Your MT5 account number
                  </p>
                </div>

                {/* Password Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Investor Password *
                  </label>
                  <input
                    name="investorPassword"
                    type="password"
                    placeholder="Enter your investor password"
                    onChange={onChange}
                    value={form.investorPassword}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Password used for read-only access to your account
                  </p>
                </div>

                {/* Account Name (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Label (Optional)
                  </label>
                  <input
                    name="name"
                    placeholder="e.g. Live Account, Demo Account"
                    onChange={onChange}
                    value={form.name}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Give this connection a memorable name
                  </p>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="space-y-3">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <span className="text-sm text-red-700 font-medium">Connection Error</span>
                      </div>
                      <p className="text-sm text-red-600 mt-1">{error}</p>
                    </div>

                    {/* Quick Recovery Suggestion */}
                    {currentErrorType && (
                      <QuickErrorRecovery
                        error={currentErrorType}
                        onRetry={handleRetry}
                      />
                    )}
                  </div>
                )}

                {/* Success Display */}
                {validationComplete && validationSuccess && !showSavePrompt && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-sm text-green-700 font-medium">Connection Validated</span>
                    </div>
                    <p className="text-sm text-green-600 mt-1">
                      Your MT5 account is connected and ready to sync trading data.
                    </p>
                  </div>
                )}

                {/* Save Credential Prompt */}
                {showSavePrompt && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-5 h-5 text-blue-500" />
                      <span className="text-sm text-blue-700 font-medium">Connection Successful!</span>
                    </div>
                    <p className="text-sm text-blue-600 mb-4">
                      Would you like to save these credentials securely for future use?
                      Your password will be encrypted and stored safely.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={handleSaveCredential}
                        disabled={savingCredential}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {savingCredential ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Save Credentials
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleSkipSave}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                      >
                        Skip for Now
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {!validationComplete ? (
                    <button
                      type="submit"
                      disabled={isValidating || !form.server || !form.login || !form.investorPassword}
                      className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isValidating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Validating Connection...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Validate Connection
                        </>
                      )}
                    </button>
                  ) : validationSuccess ? (
                    <button
                      type="submit"
                      className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Save & Continue to Sync
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setValidationComplete(false);
                        setError(null);
                      }}
                      className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700"
                    >
                      Try Again
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
              </form>

              {/* Advanced Options */}
              {showAdvanced && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Troubleshooting</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>• Make sure MT5 terminal is installed and running</p>
                    <p>• Verify your server name matches exactly (case-sensitive)</p>
                    <p>• Use your investor password, not master password</p>
                    <p>• Check if your broker requires additional authentication</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status Sidebar */}
          <div className="space-y-6">
            {/* Connection Status */}
            {form.server && form.login && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Connection Status</h3>
                <ConnectionStatusComponent
                  credentials={{
                    server: form.server,
                    login: form.login,
                    password: form.investorPassword,
                    name: form.name || undefined
                  }}
                  showDetails={true}
                />
              </div>
            )}

            {/* Error Recovery */}
            {showRecovery && currentErrorType && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Recovery Guide</h3>
                <ErrorRecoveryComponent
                  error={currentErrorType}
                  errorMessage={error || undefined}
                  onRetry={handleRetry}
                  onDismiss={dismissRecovery}
                />
              </div>
            )}

            {/* Help Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Need Help?</h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• Can't find your server name? Check MT5 terminal login window</p>
                <p>• Forgot your password? Reset it through your broker's website</p>
                <p>• Having connection issues? Try restarting MT5 terminal</p>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-yellow-900 mb-2">Security Notice</h3>
              <p className="text-sm text-yellow-700">
                We only use read-only access to sync your trading history.
                Your passwords are encrypted and never stored in plain text.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
