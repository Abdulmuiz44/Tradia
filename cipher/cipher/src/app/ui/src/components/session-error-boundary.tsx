"use client"

import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSessionStore } from '@/stores/session-store'

interface SessionErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

interface SessionErrorBoundaryProps {
  children: React.ReactNode
  fallback?: (error: Error, retry: () => void) => React.ReactNode
}

export class SessionErrorBoundary extends React.Component<
  SessionErrorBoundaryProps,
  SessionErrorBoundaryState
> {
  constructor(props: SessionErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<SessionErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Session Error Boundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo,
    })

    // Clear potentially corrupted session cache
    try {
      useSessionStore.getState().clearSessionCache()
    } catch (clearError) {
      console.error('Failed to clear session cache:', clearError)
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry)
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <h2 className="text-lg font-semibold mb-2">Session Error</h2>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            An error occurred while managing sessions. This might be due to network issues or
            corrupted session data.
          </p>
          <div className="space-y-2">
            <Button onClick={this.handleRetry} className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
            <details className="text-xs text-muted-foreground mt-4">
              <summary className="cursor-pointer">Error Details</summary>
              <pre className="mt-2 p-2 bg-muted rounded text-left overflow-auto max-w-md">
                {this.state.error.message}
                {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                  <>
                    {'\n\n'}
                    {this.state.errorInfo.componentStack}
                  </>
                )}
              </pre>
            </details>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook version for functional components
export function useSessionErrorHandler() {
  const { clearSessionCache, setEnableOptimizations } = useSessionStore()

  const handleSessionError = React.useCallback((error: Error) => {
    console.error('Session operation failed:', error)
    
    // If it's a network error, disable optimizations temporarily
    if (error.message.includes('fetch') || error.message.includes('network')) {
      setEnableOptimizations(false)
      
      // Re-enable after 30 seconds
      setTimeout(() => {
        setEnableOptimizations(true)
      }, 30000)
    }
    
    // If it's a cache-related error, clear the cache
    if (error.message.includes('cache') || error.message.includes('expired')) {
      clearSessionCache()
    }
  }, [clearSessionCache, setEnableOptimizations])

  return { handleSessionError }
}

// Session loading fallback component
export function SessionLoadingFallback({ 
  message = "Loading session...",
  timeout = 10000 // 10 seconds
}: { 
  message?: string
  timeout?: number 
}) {
  const [showError, setShowError] = React.useState(false)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowError(true)
    }, timeout)

    return () => clearTimeout(timer)
  }, [timeout])

  if (showError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-8 h-8 text-yellow-500 mb-4" />
        <p className="text-sm text-muted-foreground">
          Session is taking longer than expected to load...
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

// Session not found fallback component
export function SessionNotFoundFallback({ 
  sessionId, 
  onCreateNew,
  onGoBack 
}: { 
  sessionId: string
  onCreateNew?: () => void
  onGoBack?: () => void 
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
      <h2 className="text-lg font-semibold mb-2">Session Not Found</h2>
      <p className="text-sm text-muted-foreground mb-4 max-w-md">
        The session &quot;{sessionId}&quot; could not be found. It may have been deleted or is no longer available.
      </p>
      <div className="flex gap-2">
        {onGoBack && (
          <Button variant="outline" onClick={onGoBack}>
            Go Back
          </Button>
        )}
        {onCreateNew && (
          <Button onClick={onCreateNew}>
            Create New Session
          </Button>
        )}
      </div>
    </div>
  )
}