import { Analytics } from '@vercel/analytics/react';

// Analytics event types
export type AnalyticsEvent =
  | 'user_signup'
  | 'user_login'
  | 'ai_chat_sent'
  | 'ai_chat_received'
  | 'file_upload'
  | 'plan_upgrade'
  | 'plan_downgrade'
  | 'error_occurred'
  | 'page_view'
  | 'feature_used';

// Custom analytics tracking
export const trackEvent = (event: AnalyticsEvent, properties?: Record<string, any>) => {
  if (typeof window !== 'undefined' && (window as any).va) {
    (window as any).va('event', {
      name: event,
      properties: {
        timestamp: new Date().toISOString(),
        ...properties,
      },
    });
  } else {
    console.log('Analytics event:', event, properties);
  }
};

// User journey tracking
export const trackUserJourney = {
  signup: (method: string, plan?: string) => {
    trackEvent('user_signup', { method, plan });
  },

  login: (method: string) => {
    trackEvent('user_login', { method });
  },

  chatInteraction: (messageCount: number, plan: string) => {
    trackEvent('ai_chat_sent', { messageCount, plan });
  },

  fileUpload: (fileType: string, fileSize: number, plan: string) => {
    trackEvent('file_upload', { fileType, fileSize, plan });
  },

  planChange: (fromPlan: string, toPlan: string, reason?: string) => {
    trackEvent('plan_upgrade', { fromPlan, toPlan, reason });
  },

  error: (errorType: string, errorMessage: string, context?: Record<string, any>) => {
    trackEvent('error_occurred', {
      errorType,
      errorMessage,
      ...context,
    });
  },

  featureUsage: (featureName: string, usage: Record<string, any>) => {
    trackEvent('feature_used', { featureName, ...usage });
  },
};

// Page view tracking
export const trackPageView = (page: string, properties?: Record<string, any>) => {
  trackEvent('page_view', { page, ...properties });
};

// Performance tracking
export const trackPerformance = (metric: string, value: number, context?: Record<string, any>) => {
  trackEvent('feature_used', { feature: 'performance_metric', metric, value, ...context });
};

// Revenue tracking
export const trackRevenue = (amount: number, currency: string = 'USD', plan?: string) => {
  trackEvent('feature_used', { feature: 'revenue', amount, currency, plan });
};

// Custom hook for analytics
export const useAnalytics = () => {
  return {
    trackEvent,
    trackUserJourney,
    trackPageView,
    trackPerformance,
    trackRevenue,
  };
};

// Analytics component wrapper - moved to separate component file
