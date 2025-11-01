// Enhanced API client with error handling, retries, and rate limiting
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
  retryable: boolean;
  details?: any;
}

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly retryable: boolean;
  public readonly details?: any;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiClientError';
    this.code = error.code;
    this.statusCode = error.statusCode;
    this.retryable = error.retryable;
    this.details = error.details;
  }
}

// Enhanced fetch with retry logic
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3,
  backoffMs: number = 1000
): Promise<Response> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      // Don't retry on client errors (4xx)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return response;
      }

      // Retry on server errors (5xx) and rate limits (429)
      if (response.status >= 500 || response.status === 429) {
        if (attempt < maxRetries) {
          const delay = backoffMs * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

      return response;
    } catch (error) {
      lastError = error as Error;

      // Retry on network errors
      if (attempt < maxRetries) {
        const delay = backoffMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  throw lastError!;
}

// API client methods
export const apiClient = {
  async chat(message: string, tradeHistory: any[], mode: string): Promise<{ response: string }> {
    try {
      const response = await fetchWithRetry('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message, tradeHistory, mode }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        throw new ApiClientError({
          message: errorData.error || `Request failed with status ${response.status}`,
          code: 'CHAT_ERROR',
          statusCode: response.status,
          retryable: response.status >= 500 || response.status === 429,
          details: errorData,
        });
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }

      throw new ApiClientError({
        message: 'Network error occurred',
        code: 'NETWORK_ERROR',
        statusCode: 0,
        retryable: true,
        details: error,
      });
    }
  },

  async uploadFile(file: File): Promise<{ file: any }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', file.name);
      formData.append('fileSize', file.size.toString());
      formData.append('mimeType', file.type);

      const response = await fetchWithRetry('/api/upload', {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type for FormData - browser sets it with boundary
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        throw new ApiClientError({
          message: errorData.error || `Upload failed with status ${response.status}`,
          code: 'UPLOAD_ERROR',
          statusCode: response.status,
          retryable: response.status >= 500 || response.status === 429,
          details: errorData,
        });
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }

      throw new ApiClientError({
        message: 'Upload failed due to network error',
        code: 'NETWORK_ERROR',
        statusCode: 0,
        retryable: true,
        details: error,
      });
    }
  },

  async getUserProfile(): Promise<any> {
    try {
      const response = await fetchWithRetry('/api/user/profile', {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        throw new ApiClientError({
          message: errorData.error || 'Failed to fetch profile',
          code: 'PROFILE_ERROR',
          statusCode: response.status,
          retryable: response.status >= 500,
          details: errorData,
        });
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }

      throw new ApiClientError({
        message: 'Failed to load profile',
        code: 'NETWORK_ERROR',
        statusCode: 0,
        retryable: true,
        details: error,
      });
    }
  },
};

// Rate limiting helper
export class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();

  isRateLimited(key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now > record.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
      return false;
    }

    if (record.count >= maxAttempts) {
      return true;
    }

    record.count++;
    return false;
  }

  getRemainingTime(key: string): number {
    const record = this.attempts.get(key);
    if (!record) return 0;

    const remaining = record.resetTime - Date.now();
    return Math.max(0, remaining);
  }
}

export const globalRateLimiter = new RateLimiter();
