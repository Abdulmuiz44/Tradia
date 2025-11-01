"use client"

import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

// Create a client optimized for immediate UI updates
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Balance between performance and freshness for session data
        staleTime: 30 * 1000, // 30 seconds - fresh enough for real-time feel
        gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
        refetchOnWindowFocus: false, // Prevent unnecessary refetches
        refetchOnMount: true, // Always fetch on mount for consistency
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors except 408 (timeout) and 429 (rate limit)
          if (error?.status >= 400 && error?.status < 500 && 
              error?.status !== 408 && error?.status !== 429) {
            return false
          }
          // Retry up to 3 times for other errors
          return failureCount < 3
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        // Optimistic UI updates with proper error handling
        retry: (failureCount, error: any) => {
          // Don't retry mutations on client errors
          if (error?.status >= 400 && error?.status < 500) {
            return false
          }
          // Retry mutations once for server errors
          return failureCount < 1
        },
        // Enable network mode for offline resilience
        networkMode: 'offlineFirst',
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient()
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
  }
}

interface QueryProviderProps {
  children: React.ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false} 
          buttonPosition="bottom-left"
        />
      )}
    </QueryClientProvider>
  )
}