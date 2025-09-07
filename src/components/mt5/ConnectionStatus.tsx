// src/components/mt5/ConnectionStatus.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { mt5Integration } from "@/lib/mt5-integration";
import type { MT5Credentials, MT5ConnectionResult } from "@/types/mt5";
import {
  Wifi,
  WifiOff,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Clock,
} from "lucide-react";

type ConnectionStatusType = "checking" | "connected" | "error" | "disconnected";

interface ConnectionStatusProps {
  credentials: MT5Credentials;
  showDetails?: boolean;
  compact?: boolean;
  onStatusChange?: (connected: boolean) => void;
}

export function useConnectionStatus(credentials: MT5Credentials) {
  const [status, setStatus] = useState<ConnectionStatusType>("checking");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    setStatus("checking");
    setError(null);

    try {
      const result: MT5ConnectionResult = await mt5Integration.testConnection(
        credentials
      );

      if (result && result.success) {
        setStatus("connected");
        setLastChecked(new Date());
      } else {
        setStatus("error");
        setError(result?.error || result?.message || "Connection failed");
      }
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Connection test failed");
    }
  }, [credentials]);

  useEffect(() => {
    checkConnection();
    const intervalId: ReturnType<typeof setInterval> = setInterval(() => {
      checkConnection();
    }, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [credentials, checkConnection]);

  return { status, lastChecked, error, checkConnection };
}

export default function ConnectionStatusComponent({
  credentials,
  showDetails = false,
  compact = false,
  onStatusChange,
}: ConnectionStatusProps) {
  const [status, setStatus] = useState<ConnectionStatusType>("checking");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const isTestingRef = useRef(isTesting);
  useEffect(() => {
    isTestingRef.current = isTesting;
  }, [isTesting]);

  const checkConnection = useCallback(async () => {
    setIsTesting(true);
    setStatus("checking");
    setError(null);

    try {
      const result: MT5ConnectionResult = await mt5Integration.testConnection(
        credentials
      );

      if (result && result.success) {
        setStatus("connected");
        setLastChecked(new Date());
        onStatusChange?.(true);
      } else {
        setStatus("error");
        setError(result?.error || result?.message || "Connection failed");
        onStatusChange?.(false);
      }
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Connection test failed");
      onStatusChange?.(false);
    } finally {
      setIsTesting(false);
    }
  }, [credentials, onStatusChange]);

  useEffect(() => {
    checkConnection();
    const intervalId: ReturnType<typeof setInterval> = setInterval(() => {
      if (!isTestingRef.current) {
        checkConnection();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [credentials, checkConnection]);

  const getStatusIcon = () => {
    switch (status) {
      case "checking":
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case "connected":
        return <Wifi className="w-4 h-4 text-green-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <WifiOff className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "checking":
        return "Checking connection...";
      case "connected":
        return "Connected";
      case "error":
        return "Connection failed";
      default:
        return "Disconnected";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "checking":
        return "text-blue-600";
      case "connected":
        return "text-green-600";
      case "error":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
        <button
          onClick={checkConnection}
          disabled={isTesting}
          className="p-1 hover:bg-gray-100 rounded"
          title="Refresh connection status"
        >
          <RefreshCw
            className={`w-3 h-3 ${isTesting ? "animate-spin" : ""}`}
          />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <div className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </div>
            {showDetails && credentials.name && (
              <div className="text-xs text-gray-500">{credentials.name}</div>
            )}
          </div>
        </div>

        <button
          onClick={checkConnection}
          disabled={isTesting}
          className="flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
        >
          <RefreshCw
            className={`w-3 h-3 ${isTesting ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {showDetails && (
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Server:</span>
            <span className="font-mono">{credentials.server}</span>
          </div>
          <div className="flex justify-between">
            <span>Login:</span>
            <span className="font-mono">{credentials.login}</span>
          </div>
        </div>
      )}

      {lastChecked && (
        <div className="flex items-center gap-1 mt-3 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>Last checked: {lastChecked.toLocaleTimeString()}</span>
        </div>
      )}

      {error && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {error}
        </div>
      )}

      {status === "connected" && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
          <div className="flex items-center gap-2 text-xs text-green-700">
            <CheckCircle className="w-3 h-3" />
            <span>MT5 connection is active and ready for sync</span>
          </div>
        </div>
      )}
    </div>
  );
}
