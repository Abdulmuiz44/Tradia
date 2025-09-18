// src/components/mt5/MonitoringWidget.tsx
"use client";

import React, { useState, useEffect } from "react";
import { syncProgressTracker } from "@/lib/sync-progress";
import {
  Activity,
  TrendingUp,
  Clock,
  Database,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from "lucide-react";

interface MonitoringWidgetProps {
  userId?: string;
  compact?: boolean;
  className?: string;
}

export function MonitoringMiniWidget({
  userId,
  className = ""
}: Omit<MonitoringWidgetProps, 'compact'>) {
  const [stats, setStats] = useState({
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    lastSyncTime: null as Date | null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadStats();
    }
  }, [userId]);

  const loadStats = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const syncs = await syncProgressTracker.getUserSyncs(userId, 10);

      const successfulSyncs = syncs.filter(s => s.status === 'completed').length;
      const failedSyncs = syncs.filter(s => s.status === 'failed').length;
      const lastSync = syncs.find(s => s.status === 'completed');

      setStats({
        totalSyncs: syncs.length,
        successfulSyncs,
        failedSyncs,
        lastSyncTime: lastSync ? new Date(lastSync.completedAt || lastSync.startedAt) : null
      });
    } catch (error) {
      console.error('Failed to load monitoring stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg ${className}`}>
        <Activity className="w-4 h-4 text-blue-500 animate-pulse" />
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg ${className}`}>
      <Activity className="w-5 h-5 text-blue-500" />

      <div className="flex-1">
        <div className="text-sm font-medium text-gray-900">
          Broker Monitoring
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <span>{stats.totalSyncs} syncs</span>
          <span className="text-green-600">{stats.successfulSyncs} successful</span>
          {stats.failedSyncs > 0 && (
            <span className="text-red-600">{stats.failedSyncs} failed</span>
          )}
        </div>
      </div>

      {stats.lastSyncTime && (
        <div className="text-xs text-gray-500">
          {stats.lastSyncTime.toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

export default function MonitoringWidget({
  userId,
  compact = false,
  className = ""
}: MonitoringWidgetProps) {
  const [stats, setStats] = useState({
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    avgSyncTime: 0,
    lastSyncTime: null as Date | null,
    recentSyncs: [] as any[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadStats();
    }
  }, [userId]);

  const loadStats = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const syncs = await syncProgressTracker.getUserSyncs(userId, 20);

      const successfulSyncs = syncs.filter(s => s.status === 'completed');
      const failedSyncs = syncs.filter(s => s.status === 'failed');

      // Calculate average sync time
      const completedSyncs = successfulSyncs.filter(s => s.completedAt);
      const avgSyncTime = completedSyncs.length > 0
        ? completedSyncs.reduce((acc, sync) => {
            const start = new Date(sync.startedAt).getTime();
            const end = new Date(sync.completedAt!).getTime();
            return acc + (end - start);
          }, 0) / completedSyncs.length / 1000 // Convert to seconds
        : 0;

      const lastSync = syncs.find(s => s.status === 'completed');

      setStats({
        totalSyncs: syncs.length,
        successfulSyncs: successfulSyncs.length,
        failedSyncs: failedSyncs.length,
        avgSyncTime,
        lastSyncTime: lastSync ? new Date(lastSync.completedAt || lastSync.startedAt) : null,
        recentSyncs: syncs.slice(0, 5)
      });
    } catch (error) {
      console.error('Failed to load monitoring stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (compact) {
    return <MonitoringMiniWidget userId={userId} className={className} />;
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading monitoring data...</span>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-blue-500" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Broker Monitoring</h3>
            <p className="text-sm text-gray-600">Sync performance and health metrics</p>
          </div>
        </div>

        <button
          onClick={loadStats}
          className="p-2 hover:bg-gray-100 rounded-lg"
          title="Refresh data"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{stats.totalSyncs}</div>
          <div className="text-xs text-blue-600">Total Syncs</div>
        </div>

        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{stats.successfulSyncs}</div>
          <div className="text-xs text-green-600">Successful</div>
        </div>

        <div className="text-center p-3 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{stats.failedSyncs}</div>
          <div className="text-xs text-red-600">Failed</div>
        </div>

        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {formatDuration(stats.avgSyncTime)}
          </div>
          <div className="text-xs text-purple-600">Avg Duration</div>
        </div>
      </div>

      {/* Success Rate */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Success Rate</span>
          <span className="text-sm text-gray-600">
            {stats.totalSyncs > 0
              ? Math.round((stats.successfulSyncs / stats.totalSyncs) * 100)
              : 0
            }%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full"
            style={{
              width: `${stats.totalSyncs > 0 ? (stats.successfulSyncs / stats.totalSyncs) * 100 : 0}%`
            }}
          />
        </div>
      </div>

      {/* Last Sync Info */}
      {stats.lastSyncTime && (
        <div className="flex items-center gap-2 mb-6 p-3 bg-gray-50 rounded-lg">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-700">
            Last successful sync: {stats.lastSyncTime.toLocaleString()}
          </span>
        </div>
      )}

      {/* Recent Syncs */}
      {stats.recentSyncs.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Syncs</h4>
          <div className="space-y-2">
            {stats.recentSyncs.map((sync) => (
              <div key={sync.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  {sync.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                  {sync.status === 'failed' && <AlertCircle className="w-4 h-4 text-red-500" />}
                  {sync.status === 'running' && <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />}

                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {sync.metadata?.accountName || 'MT5 Account'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(sync.startedAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-sm font-medium ${
                    sync.status === 'completed' ? 'text-green-600' :
                    sync.status === 'failed' ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {sync.status === 'completed' ? 'Success' :
                     sync.status === 'failed' ? 'Failed' : 'Running'}
                  </div>
                  {sync.totalTrades && (
                    <div className="text-xs text-gray-500">
                      {sync.totalTrades} trades
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Data State */}
      {stats.totalSyncs === 0 && (
        <div className="text-center py-8">
          <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-sm font-medium text-gray-900 mb-2">No Sync Data</h4>
          <p className="text-sm text-gray-600">
            Connect a broker account and run your first sync to see monitoring data.
          </p>
        </div>
      )}
    </div>
  );
}
