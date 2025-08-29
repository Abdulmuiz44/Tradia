// src/components/mt5/ConnectionMonitor.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ConnectionHealth } from "@/lib/connection-monitor";
import {
  Activity,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Settings,
  TrendingUp,
  Zap,
  Server
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ConnectionMonitorProps {
  userId?: string;
  autoStart?: boolean;
  showControls?: boolean;
  compact?: boolean;
  className?: string;
}

interface MonitoringStats {
  totalCredentials: number;
  healthyConnections: number;
  degradedConnections: number;
  failedConnections: number;
  averageResponseTime: number;
  averageUptime: number;
}

export default function ConnectionMonitorComponent({
  userId,
  autoStart = true,
  showControls = true,
  compact = false,
  className = ""
}: ConnectionMonitorProps) {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [healthStatuses, setHealthStatuses] = useState<ConnectionHealth[]>([]);
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Load monitoring status
  const loadMonitoringStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/mt5/monitoring");

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to load monitoring status");
      }

      const data = await response.json();
      setIsMonitoring(data.monitoring?.isActive || false);
      setHealthStatuses(data.monitoring?.credentials || []);
      setStats(data.monitoring?.stats || null);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load monitoring status");
    } finally {
      setLoading(false);
    }
  }, []);

  // Start monitoring
  const startMonitoring = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/mt5/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          config: {
            checkInterval: 5 * 60 * 1000, // 5 minutes
            timeout: 30000, // 30 seconds
            maxConsecutiveFailures: 3,
            enableRealTimeUpdates: true
          }
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to start monitoring");
      }

      setIsMonitoring(true);
      await loadMonitoringStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start monitoring");
    } finally {
      setLoading(false);
    }
  };

  // Stop monitoring
  const stopMonitoring = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/mt5/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to stop monitoring");
      }

      setIsMonitoring(false);
      setHealthStatuses([]);
      setStats(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop monitoring");
    } finally {
      setLoading(false);
    }
  };

  // Force health check
  const forceHealthCheck = async (credentialId: string) => {
    try {
      const response = await fetch("/api/mt5/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "force_check",
          credentialId
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to perform health check");
      }

      // Refresh status after check
      await loadMonitoringStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to perform health check");
    }
  };

  // Auto-start monitoring
  useEffect(() => {
    if (autoStart) {
      loadMonitoringStatus();
    }
  }, [autoStart, loadMonitoringStatus]);

  // Get status icon and color
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'connected':
        return { icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-100', label: 'Connected' };
      case 'degraded':
        return { icon: AlertTriangle, color: 'text-yellow-500', bgColor: 'bg-yellow-100', label: 'Degraded' };
      case 'error':
        return { icon: WifiOff, color: 'text-red-500', bgColor: 'bg-red-100', label: 'Error' };
      case 'unknown':
      default:
        return { icon: Clock, color: 'text-gray-500', bgColor: 'bg-gray-100', label: 'Unknown' };
    }
  };

  // Format response time
  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Compact view
  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg ${className}`}>
        <div className="flex items-center gap-2">
          <Activity className={`w-4 h-4 ${isMonitoring ? 'text-green-500' : 'text-gray-400'}`} />
          <span className="text-sm font-medium">
            {isMonitoring ? 'Monitoring Active' : 'Monitoring Inactive'}
          </span>
        </div>

        {stats && (
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span>{stats.healthyConnections}/{stats.totalCredentials} healthy</span>
            <span>{stats.averageResponseTime.toFixed(0)}ms avg</span>
          </div>
        )}

        {showControls && (
          <div className="ml-auto">
            <button
              onClick={isMonitoring ? stopMonitoring : startMonitoring}
              disabled={loading}
              className={`px-3 py-1 text-xs rounded ${
                isMonitoring
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {loading ? '...' : isMonitoring ? 'Stop' : 'Start'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Full view
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className={`w-5 h-5 ${isMonitoring ? 'text-green-500' : 'text-gray-400'}`} />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Connection Monitor</h3>
            <p className="text-sm text-gray-600">
              {isMonitoring ? 'Real-time connection health monitoring' : 'Monitoring is currently inactive'}
            </p>
          </div>
        </div>

        {showControls && (
          <div className="flex items-center gap-2">
            <button
              onClick={loadMonitoringStatus}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-600"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger className="p-2 text-gray-400 hover:text-gray-600">
                <Settings className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={isMonitoring ? stopMonitoring : startMonitoring}>
                  {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={loadMonitoringStatus}>
                  Refresh Status
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Monitoring Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-900">Total</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">{stats.totalCredentials}</div>
            <div className="text-xs text-gray-600">credentials</div>
          </div>

          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-gray-900">Healthy</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-green-600">{stats.healthyConnections}</div>
            <div className="text-xs text-gray-600">connected</div>
          </div>

          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-gray-900">Response</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              {stats.averageResponseTime.toFixed(0)}ms
            </div>
            <div className="text-xs text-gray-600">avg time</div>
          </div>

          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-900">Uptime</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              {stats.averageUptime.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-600">avg uptime</div>
          </div>
        </div>
      )}

      {/* Connection Status List */}
      {healthStatuses.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Connection Status</h4>

          {healthStatuses.map((health) => {
            const statusInfo = getStatusInfo(health.status);
            const StatusIcon = statusInfo.icon;

            return (
              <div key={health.credentialId} className="p-4 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${statusInfo.bgColor}`}>
                      <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          Credential {health.credentialId.slice(0, 8)}...
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          health.status === 'connected' ? 'bg-green-100 text-green-800' :
                          health.status === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                          health.status === 'error' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span>Response: {formatResponseTime(health.responseTime)}</span>
                        <span>Uptime: {health.uptimePercentage.toFixed(1)}%</span>
                        <span>Last check: {health.lastChecked.toLocaleTimeString()}</span>
                        {health.consecutiveFailures > 0 && (
                          <span className="text-red-600">
                            {health.consecutiveFailures} failures
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => forceHealthCheck(health.credentialId)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title="Force health check"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {health.errorMessage && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {health.errorMessage}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {healthStatuses.length === 0 && !loading && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Connections to Monitor</h3>
          <p className="text-gray-600 mb-4">
            Add MT5 credentials to start monitoring connection health.
          </p>
          {showControls && (
            <button
              onClick={startMonitoring}
              disabled={loading}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300"
            >
              {loading ? 'Starting...' : 'Start Monitoring'}
            </button>
          )}
        </div>
      )}

      {/* Last Update */}
      {lastUpdate && (
        <div className="text-xs text-gray-500 text-center">
          Last updated: {lastUpdate.toLocaleString()}
        </div>
      )}
    </div>
  );
}