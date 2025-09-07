// src/components/mt5/ErrorRecovery.tsx
"use client";

import React, { useState } from "react";
import type { ConnectionError } from "@/types/mt5";
import { mt5ErrorRecovery } from "@/lib/mt5-error-recovery";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Info,
  ExternalLink,
} from "lucide-react";

/**
 * This component is defensive about the shape returned by mt5ErrorRecovery.getRecoveryPlan(...)
 * — we treat that result as `any` and verify properties at runtime so TypeScript won't complain
 * and so the UI won't crash if the recovery lib returns an unexpected shape.
 */

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
  className = "",
}: ErrorRecoveryProps) {
  const [expandedAction, setExpandedAction] = useState<string | null>(null);

  // Treat the recovery plan as any and be defensive when reading fields.
  const plan: any = (() => {
    try {
      return mt5ErrorRecovery.getRecoveryPlan(error) ?? {};
    } catch {
      return {};
    }
  })();

  const severity: string = plan?.severity ?? "low";
  const estimatedTime: string = plan?.estimatedTime ?? "Unknown";
  const actions: any[] = Array.isArray(plan?.actions) ? plan.actions : [];

  const getSeverityIcon = (s: string): React.ReactNode => {
    switch (s) {
      case "critical":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "high":
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case "medium":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getSeverityColor = (s: string): string => {
    switch (s) {
      case "critical":
        return "border-red-200 bg-red-50";
      case "high":
        return "border-orange-200 bg-orange-50";
      case "medium":
        return "border-yellow-200 bg-yellow-50";
      default:
        return "border-blue-200 bg-blue-50";
    }
  };

  const getActionIcon = (actionType: string): React.ReactNode => {
    switch (actionType) {
      case "retry":
      case "reconnect":
        return <CheckCircle className="w-4 h-4" />;
      case "reconfigure":
      case "check_terminal":
        return <Info className="w-4 h-4" />;
      case "contact_support":
        return <ExternalLink className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getPriorityBadge = (priority: string | undefined) => {
    const p = priority ?? "medium";
    const colors: Record<string, string> = {
      high: "bg-red-100 text-red-800",
      medium: "bg-yellow-100 text-yellow-800",
      low: "bg-blue-100 text-blue-800",
    };

    const cls = colors[p] ?? colors["medium"];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${cls}`}>
        {p}
      </span>
    );
  };

  return (
    <div className={`border rounded-lg p-4 ${getSeverityColor(severity)} ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {getSeverityIcon(severity)}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Connection Error Recovery</h3>
            <p className="text-xs text-gray-600 mt-1">Estimated recovery time: {estimatedTime}</p>
          </div>
        </div>

        {onDismiss && (
          <button onClick={onDismiss} className="p-1 rounded hover:bg-gray-200" title="Dismiss">
            <XCircle className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>

      {/* Error Details */}
      <div className="mb-4">
        <p className="text-sm text-gray-700 mb-2">
          {errorMessage ?? (typeof mt5ErrorRecovery.getUserFriendlyMessage === "function"
            ? mt5ErrorRecovery.getUserFriendlyMessage(error)
            : String(error))}
        </p>

        <div className="text-xs text-gray-500">
          Error type: {String(error).replace(/_/g, " ").toUpperCase()}
        </div>
      </div>

      {/* Recovery Actions */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-900">Recommended Actions:</h4>

        {actions.map((action: any, index: number) => {
          const key = `${String(action?.type ?? "action")}-${index}`;
          const isExpanded = expandedAction === key;

          return (
            <div key={key} className="border border-gray-200 rounded-lg bg-white">
              <button
                onClick={() => setExpandedAction(isExpanded ? null : key)}
                className="w-full p-3 text-left flex items-center justify-between hover:bg-gray-50"
                type="button"
              >
                <div className="flex items-center gap-3">
                  {getActionIcon(String(action?.type ?? ""))}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{String(action?.title ?? "Action")}</span>
                      {getPriorityBadge(String(action?.priority ?? "medium"))}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{String(action?.description ?? "")}</p>
                  </div>
                </div>

                <div className="text-gray-400">{isExpanded ? "−" : "+"}</div>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 border-t border-gray-100">
                  {action?.userAction && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-800">
                      <strong>User Action:</strong> {String(action.userAction)}
                    </div>
                  )}

                  {action?.autoRetry && (
                    <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-800">
                      <strong>Auto-Retry:</strong> This action will be attempted automatically.
                    </div>
                  )}

                  {String(action?.type) === "retry" && onRetry && (
                    <button
                      onClick={onRetry}
                      className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                      type="button"
                    >
                      Retry Now
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          If these steps don’t resolve the issue, please contact our support team with the error details.
        </p>
      </div>
    </div>
  );
}

/**
 * Quick inline recovery hint used for small UIs
 */
export function QuickErrorRecovery({
  error,
  onRetry,
}: {
  error: ConnectionError;
  onRetry?: () => void;
}) {
  const plan: any = (() => {
    try {
      return mt5ErrorRecovery.getRecoveryPlan(error) ?? {};
    } catch {
      return {};
    }
  })();

  const actions: any[] = Array.isArray(plan?.actions) ? plan.actions : [];
  const primaryAction = actions.find((a) => String(a?.priority) === "high");

  if (!primaryAction) return null;

  return (
    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded text-sm">
      <Info className="w-4 h-4 text-blue-600" />
      <span className="text-blue-800">{String(primaryAction.description ?? "")}</span>
      {String(primaryAction.type) === "retry" && onRetry && (
        <button
          onClick={onRetry}
          className="ml-auto px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          type="button"
        >
          Retry
        </button>
      )}
    </div>
  );
}
