import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { cn } from '@/lib/utils';

interface ErrorRecoveryProps {
  error: Error | null;
  onRetry?: () => void;
  onReset?: () => void;
  showDetails?: boolean;
  className?: string;
}

export const ErrorRecovery: React.FC<ErrorRecoveryProps> = ({
  error,
  onRetry,
  onReset,
  showDetails = process.env.NODE_ENV === 'development',
  className,
}) => {
  const { error: showErrorToast } = useToast();
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = useCallback(async () => {
    if (!onRetry) return;

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      await onRetry();
    } catch (retryError) {
      showErrorToast('Retry Failed', 'The operation failed again. Please try a different approach.');
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry, showErrorToast]);

  const handleReset = useCallback(() => {
    setRetryCount(0);
    onReset?.();
  }, [onReset]);

  if (!error) return null;

  const isNetworkError = error.message.includes('fetch') || error.message.includes('network');
  const isAuthError = error.message.includes('unauthorized') || error.message.includes('auth');
  const canRetry = onRetry && retryCount < 3 && !isAuthError;

  return (
    <div className={cn(
      'rounded-lg border p-4',
      isNetworkError ? 'border-yellow-200 bg-yellow-50' :
      isAuthError ? 'border-red-200 bg-red-50' :
      'border-gray-200 bg-gray-50',
      className
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isNetworkError ? 'bg-yellow-100 text-yellow-600' :
          isAuthError ? 'bg-red-100 text-red-600' :
          'bg-gray-100 text-gray-600'
        )}>
          {isNetworkError ? <WifiOff className="w-4 h-4" /> :
           isAuthError ? <AlertTriangle className="w-4 h-4" /> :
           <AlertCircle className="w-4 h-4" />}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-gray-900">
            {isNetworkError ? 'Connection Error' :
             isAuthError ? 'Authentication Error' :
             'Something went wrong'}
          </h3>

          <p className="text-sm text-gray-600 mt-1">
            {isNetworkError ? 'Please check your internet connection and try again.' :
             isAuthError ? 'Please log in again to continue.' :
             'We encountered an unexpected error. You can try again or reset the page.'}
          </p>

          <div className="flex items-center gap-2 mt-3">
            {canRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetry}
                disabled={isRetrying}
                className="flex items-center gap-1"
              >
                {isRetrying ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                {isRetrying ? 'Retrying...' : `Retry${retryCount > 0 ? ` (${retryCount})` : ''}`}
              </Button>
            )}

            {onReset && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleReset}
                className="text-gray-600 hover:text-gray-800"
              >
                Reset
              </Button>
            )}
          </div>

          {showDetails && error && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
                Error Details (Development)
              </summary>
              <div className="mt-2 p-2 bg-white rounded text-xs font-mono border overflow-auto max-h-32">
                <div className="mb-1">
                  <strong>Name:</strong> {error.name}
                </div>
                <div className="mb-1">
                  <strong>Message:</strong> {error.message}
                </div>
                {error.stack && (
                  <div>
                    <strong>Stack:</strong>
                    <pre className="whitespace-pre-wrap text-xs mt-1">{error.stack}</pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
};

// Hook for error handling with automatic recovery
export const useErrorRecovery = (maxRetries: number = 3) => {
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { error: showErrorToast } = useToast();

  const handleError = useCallback((err: Error | string, showToast: boolean = true) => {
    const errorObj = typeof err === 'string' ? new Error(err) : err;
    setError(errorObj);

    if (showToast) {
      showErrorToast('Error', errorObj.message);
    }
  }, [showErrorToast]);

  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  const retry = useCallback(async (operation: () => Promise<void>) => {
    if (retryCount >= maxRetries) {
      showErrorToast('Max Retries Reached', 'Please try again later or contact support.');
      return;
    }

    setRetryCount(prev => prev + 1);

    try {
      await operation();
      clearError();
    } catch (err) {
      handleError(err as Error);
    }
  }, [retryCount, maxRetries, showErrorToast, clearError, handleError]);

  return {
    error,
    retryCount,
    handleError,
    clearError,
    retry,
    canRetry: retryCount < maxRetries,
  };
};

// Network status monitor
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { info, error } = useToast();

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      info('Connection Restored', 'You are back online.');
    };

    const handleOffline = () => {
      setIsOnline(false);
      error('Connection Lost', 'You appear to be offline. Some features may not work.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [info, error]);

  return isOnline;
};

// Global error handler for unhandled errors
export const setupGlobalErrorHandler = () => {
  const handleUnhandledError = (event: ErrorEvent) => {
    console.error('Unhandled error:', event.error);
    // In production, send to error reporting service
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    console.error('Unhandled promise rejection:', event.reason);
    // In production, send to error reporting service
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }
};
