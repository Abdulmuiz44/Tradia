import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    environment: process.env.NODE_ENV || 'development',
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.1,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}

// Custom error reporting functions
export const reportError = (error: Error, context?: Record<string, any>) => {
  if (SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (context) {
        Object.keys(context).forEach((key) => {
          scope.setTag(key, context[key]);
        });
      }
      Sentry.captureException(error);
    });
  } else {
    console.error('Error reported:', error, context);
  }
};

export const reportMessage = (message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) => {
  if (SENTRY_DSN) {
    Sentry.withScope((scope) => {
      scope.setLevel(level);
      if (context) {
        Object.keys(context).forEach((key) => {
          scope.setTag(key, context[key]);
        });
      }
      Sentry.captureMessage(message);
    });
  } else {
    console.log(`[${level.toUpperCase()}] ${message}`, context);
  }
};

// User tracking
export const setUser = (user: { id: string; email: string; plan?: string }) => {
  if (SENTRY_DSN) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      plan: user.plan,
    });
  }
};

export const clearUser = () => {
  if (SENTRY_DSN) {
    Sentry.setUser(null);
  }
};

// Performance tracking
export const startTransaction = (name: string, op: string) => {
  if (SENTRY_DSN) {
    // Sentry v8+ uses startSpan instead of startTransaction
    return Sentry.startSpan({
      name,
      op,
    }, (span) => span);
  }
  return null;
};

export { Sentry };
