// src/components/mt5/SyncProgress.tsx
"use client";

import React, { useState, useEffect } from "react";
import { syncProgressTracker, SyncProgress } from "@/lib/sync-progress";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Clock,
  Database,
  TrendingUp,
  AlertTriangle
} from "lucide-react";

interface SyncProgressComponentProps {
  syncId: string;
  compact?: boolean;
  onClose?: () => void;
  autoClose?: boolean;
}

export default function SyncProgressComponent({
  syncId,
  compact = false,
  onClose,
  autoClose = true
}: SyncProgressComponentProps) {
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchProgress = async () => {
      try {
        const data = await syncProgressTracker.getSyncProgress(syncId);
        setProgress(data);
        setLoading(false);

        // Auto-close on completion
        if (data && (data.status === 'completed' || data.status === 'failed') && autoClose) {
          setTimeout(() => {
            if (onClose) onClose();
          }, 3000);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load progress');
        setLoading(false);
      }
    };

    // Initial fetch
    fetchProgress();

    // Poll for updates every 2 seconds
    interval = setInterval(fetchProgress, 2000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [syncId, autoClose, onClose]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading sync progress...</span>
      </div>
    );
  }

  if (error || !progress) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-sm text-red-700 font-medium">
            {error || 'Failed to load sync progress'}
          </span>
        </div>
      </div>
    );
  }

  const isCompleted = progress.status === 'completed';
  const isFailed = progress.status === 'failed';
  const isRunning = progress.status === 'running';

  if (compact) {
    return (
      <SyncProgressMini
        progress={progress}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-blue-500" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              MT5 Sync Progress
            </h3>
            <p className="text-sm text-gray-600">
              {progress.metadata?.accountName || 'MT5 Account'}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {progress.currentStep}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(progress.progress)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              isFailed ? 'bg-red-500' :
              isCompleted ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(progress.progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 mb-4">
        {isRunning && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
        {isCompleted && <CheckCircle className="w-4 h-4 text-green-500" />}
        {isFailed && <AlertCircle className="w-4 h-4 text-red-500" />}

        <span className={`text-sm font-medium ${
          isFailed ? 'text-red-600' :
          isCompleted ? 'text-green-600' : 'text-blue-600'
        }`}>
          {isRunning && 'Syncing...'}
          {isCompleted && 'Sync completed successfully'}
          {isFailed && 'Sync failed'}
        </span>
      </div>

      {/* Error Message */}
      {isFailed && progress.errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">{progress.errorMessage}</span>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {progress.totalTrades !== undefined && (
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {progress.totalTrades}
            </div>
            <div className="text-xs text-gray-500">Total Trades</div>
          </div>
        )}

        {progress.processedTrades !== undefined && (
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {progress.processedTrades}
            </div>
            <div className="text-xs text-gray-500">Processed</div>
          </div>
        )}

        {progress.newTrades !== undefined && (
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {progress.newTrades}
            </div>
            <div className="text-xs text-gray-500">New</div>
          </div>
        )}

        {progress.updatedTrades !== undefined && (
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {progress.updatedTrades}
            </div>
            <div className="text-xs text-gray-500">Updated</div>
          </div>
        )}
      </div>

      {/* Message */}
      {progress.message && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">{progress.message}</p>
        </div>
      )}

      {/* Completion Message */}
      {isCompleted && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-700">
              Sync completed! Your trade data has been updated.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact sync progress component
 */
export function SyncProgressMini({
  progress,
  onClose
}: {
  progress: SyncProgress;
  onClose?: () => void;
}) {
  const isCompleted = progress.status === 'completed';
  const isFailed = progress.status === 'failed';
  const isRunning = progress.status === 'running';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isRunning && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
          {isCompleted && <CheckCircle className="w-4 h-4 text-green-500" />}
          {isFailed && <AlertCircle className="w-4 h-4 text-red-500" />}

          <span className="text-sm font-medium text-gray-900">
            {progress.currentStep}
          </span>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-3 h-3 text-gray-500" />
          </button>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Progress</span>
          <span>{Math.round(progress.progress)}%</span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              isFailed ? 'bg-red-500' :
              isCompleted ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(progress.progress, 100)}%` }}
          />
        </div>

        {progress.message && (
          <p className="text-xs text-gray-600">{progress.message}</p>
        )}
      </div>
    </div>
  );
}