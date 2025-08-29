// src/components/mt5/ErrorRecovery.tsx
"use client";

import React, { useState } from "react";
import { ConnectionError } from "@/types/mt5";
import { mt5ErrorRecovery, ErrorRecoveryPlan, ErrorRecoveryAction } from "@/lib/mt5-error-recovery";
import { AlertTriangle, CheckCircle, Clock, XCircle, Info, ExternalLink } from "lucide-react";

interface ErrorRecoveryProps {
  error: ConnectionError;
  errorMessage?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export default function ErrorRecoveryComponent({
  error,
  errorMessage,
  onRetry,
  onDismiss,
  className = ""
}: ErrorRecoveryProps) {
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  const recoveryPlan = mt5ErrorRecovery.getRecoveryPlan(error);

  const getSeverityIcon = (severity: ErrorRecoveryPlan['severity']) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'medium':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'low':
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: ErrorRecoveryPlan['severity']) => {
    switch (severity) {
      case 'critical':
        return 'border-red-200 bg-red-50';
      case 'high':
        return 'border-orange-200 bg-orange-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'low':
        return 'border-blue-200 bg-blue-50';
    }
  };

  const getActionIcon = (action: ErrorRecoveryAction) => {
    switch (action.type) {
      case 'retry':
        return <CheckCircle className="w-4 h-4" />;
      case 'reconnect':
        return <CheckCircle className="w-4 h-4" />;
      case 'reconfigure':
        return <Info className="w-4 h-4" />;
      case 'contact_support':
        return <ExternalLink className="w-4 h-4" />;
      case 'check_terminal':
        return <Info className="w-4 h-4" />;
    }
  };

  const getPriorityBadge = (priority: ErrorRecoveryAction['priority']) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[priority]}`}>
        {priority}
      </span>
    );
  };

  return (
    <div className={`border rounded-lg p-4 ${getSeverityColor(recoveryPlan.severity)} ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {getSeverityIcon(recoveryPlan.severity)}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Connection Error Recovery
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              Estimated recovery time: {recoveryPlan.estimatedTime}
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 rounded hover:bg-gray-200"
          >
            <XCircle className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>

      {/* Error Details */}
      <div className="mb-4">
        <p className="text-sm text-gray-700 mb-2">
          {errorMessage || mt5ErrorRecovery.getUserFriendlyMessage(error)}
        </p>
        <div className="text-xs text-gray-500">
          Error type: {error.replace('_', ' ').toUpperCase()}
        </div>
      </div>

      {/* Recovery Actions */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-900">Recommended Actions:</h4>

        {recoveryPlan.actions.map((action, index) => (
          <div key={index} className="border border-gray-200 rounded-lg bg-white">
            <button
              onClick={() => setExpandedAction(
                expandedAction === `${action.type}-${index}` ? null : `${action.type}-${index}`
              )}
              className="w-full p-3 text-left flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                {getActionIcon(action)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {action.title}
                    </span>
                    {getPriorityBadge(action.priority)}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {action.description}
                  </p>
                </div>
              </div>
              <div className="text-gray-400">
                {expandedAction === `${action.type}-${index}` ? '−' : '+'}
              </div>
            </button>

            {expandedAction === `${action.type}-${index}` && (
              <div className="px-3 pb-3 border-t border-gray-100">
                {action.userAction && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-800">
                    <strong>User Action:</strong> {action.userAction}
                  </div>
                )}

                {action.autoRetry && (
                  <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-800">
                    <strong>Auto-Retry:</strong> This action will be attempted automatically.
                  </div>
                )}

                {action.type === 'retry' && onRetry && (
                  <button
                    onClick={onRetry}
                    className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    Retry Now
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          If these steps don't resolve the issue, please contact our support team with the error details.
        </p>
      </div>
    </div>
  );
}

// Quick recovery component for inline use
export function QuickErrorRecovery({
  error,
  onRetry
}: {
  error: ConnectionError;
  onRetry?: () => void;
}) {
  const recoveryPlan = mt5ErrorRecovery.getRecoveryPlan(error);
  const primaryAction = recoveryPlan.actions.find(action => action.priority === 'high');

  if (!primaryAction) return null;

  return (
    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded text-sm">
      <Info className="w-4 h-4 text-blue-600" />
      <span className="text-blue-800">{primaryAction.description}</span>
      {primaryAction.type === 'retry' && onRetry && (
        <button
          onClick={onRetry}
          className="ml-auto px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
        >
          Retry
        </button>
      )}
    </div>
  );
}