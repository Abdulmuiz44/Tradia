// src/lib/analytics.ts
import posthog from 'posthog-js';

export interface UserAnalytics {
  userId: string;
  email?: string;
  plan?: string;
  signupDate?: string;
  lastActive?: string;
}

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
}

class AnalyticsService {
  private static instance: AnalyticsService;

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Identify user for tracking
   */
  identifyUser(user: UserAnalytics): void {
    if (typeof window === 'undefined' || !posthog.__loaded) return;

    try {
      posthog.identify(user.userId, {
        email: user.email,
        plan: user.plan,
        signup_date: user.signupDate,
        last_active: user.lastActive,
        $set: {
          user_id: user.userId,
          email: user.email,
          plan: user.plan
        }
      });
    } catch (error) {
      console.warn('Analytics identify failed:', error);
    }
  }

  /**
   * Track custom events
   */
  trackEvent(event: AnalyticsEvent): void {
    if (typeof window === 'undefined' || !posthog.__loaded) return;

    try {
      posthog.capture(event.name, event.properties);
    } catch (error) {
      console.warn('Analytics track failed:', error);
    }
  }

  /**
   * Track page views
   */
  trackPageView(page: string, properties?: Record<string, any>): void {
    this.trackEvent({
      name: 'page_view',
      properties: {
        page,
        ...properties
      }
    });
  }

  /**
   * Track user signup
   */
  trackSignup(userId: string, method: string = 'email'): void {
    this.trackEvent({
      name: 'user_signup',
      properties: {
        user_id: userId,
        method,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track user login
   */
  trackLogin(userId: string, method: string = 'email'): void {
    this.trackEvent({
      name: 'user_login',
      properties: {
        user_id: userId,
        method,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track user logout
   */
  trackLogout(userId: string): void {
    this.trackEvent({
      name: 'user_logout',
      properties: {
        user_id: userId,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(feature: string, userId: string, properties?: Record<string, any>): void {
    this.trackEvent({
      name: 'feature_used',
      properties: {
        feature,
        user_id: userId,
        ...properties
      }
    });
  }

  /**
   * Track MT5 connection
   */
  trackMT5Connection(userId: string, success: boolean, server?: string): void {
    this.trackEvent({
      name: 'mt5_connection',
      properties: {
        user_id: userId,
        success,
        server,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track trade import
   */
  trackTradeImport(userId: string, count: number, source: string = 'MT5'): void {
    this.trackEvent({
      name: 'trade_import',
      properties: {
        user_id: userId,
        trade_count: count,
        source,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Get user stats from PostHog (requires server-side implementation)
   */
  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
    newUsersThisWeek: number;
    newUsersThisMonth: number;
  }> {
    // This would typically be implemented with PostHog's API
    // For now, return mock data
    return {
      totalUsers: 0,
      activeUsers: 0,
      newUsersToday: 0,
      newUsersThisWeek: 0,
      newUsersThisMonth: 0
    };
  }

  /**
   * Reset user identity (logout)
   */
  reset(): void {
    if (typeof window === 'undefined' || !posthog.__loaded) return;

    try {
      posthog.reset();
    } catch (error) {
      console.warn('Analytics reset failed:', error);
    }
  }
}

export const analytics = AnalyticsService.getInstance();