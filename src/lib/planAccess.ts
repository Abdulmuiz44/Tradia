// src/lib/planAccess.ts
// Plan-based access control system (Flutterwave-backed billing)

import type { SupabaseClient } from "@supabase/supabase-js";

export type PlanType = 'pro' | 'plus' | 'elite' | 'free' | 'starter';

export interface PlanLimits {
  mt5Accounts: number;
  aiChatsPerDay: number;
  tradeStorageDays: number;
  maxTrades: number; // -1 for unlimited
  advancedAnalytics: boolean;
  prioritySupport: boolean;
  customIntegrations: boolean;
  // New AI feature flags
  aiMLAnalysis: boolean; // AI-powered trading analysis using ML
  imageProcessing: boolean; // Image processing for trade screenshots
  personalizedStrategy: boolean; // Personalized strategy recommendations
  realTimeAnalytics: boolean; // Real-time performance analytics
  riskManagement: boolean; // Risk management analysis
  marketTiming: boolean; // Market timing and entry/exit recommendations
  // Planner limits
  maxTradePlans: number; // -1 for unlimited
  // UI/Actions
  exportData: boolean; // Enable export buttons
  shareReports: boolean; // Enable share report
  alerts: boolean; // Enable set alerts
  // File uploads
  maxFileUploadsPerDay: number; // -1 for unlimited
  customizeView: boolean; // Enable customize view
  // TradingView features
  tvAlerts: number; // Monthly TV alert optimizations (-1 unlimited)
  tvBacktests: number; // Monthly TV backtest sims
  tvPatterns: number; // Monthly pattern scans
  tvScreener: boolean; // Basic screener access
  tvBroker: boolean; // Broker execution (pro+)
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    mt5Accounts: 0,
    aiChatsPerDay: 5,
    tradeStorageDays: 30,
    maxTrades: 50,
    advancedAnalytics: false,
    prioritySupport: false,
    customIntegrations: false,
    aiMLAnalysis: true,
    imageProcessing: false,
    personalizedStrategy: false,
    realTimeAnalytics: true,
    riskManagement: false,
    marketTiming: false,
    maxTradePlans: 3,
    exportData: false,
    shareReports: false,
    alerts: false,
    customizeView: false,
    tvAlerts: 5,
    tvBacktests: 2,
    tvPatterns: 10,
    tvScreener: false,
    tvBroker: false,
    maxFileUploadsPerDay: 0,
  },

  starter: {
    mt5Accounts: 0,
    aiChatsPerDay: 10,
    tradeStorageDays: 60,
    maxTrades: 100,
    advancedAnalytics: false,
    prioritySupport: false,
    customIntegrations: false,
    aiMLAnalysis: true,
    imageProcessing: false,
    personalizedStrategy: false,
    realTimeAnalytics: true,
    riskManagement: false,
    marketTiming: false,
    maxTradePlans: 5,
    exportData: false,
    shareReports: false,
    alerts: false,
    customizeView: false,
    tvAlerts: 10,
    tvBacktests: 5,
    tvPatterns: 20,
    tvScreener: false,
    tvBroker: false,
    maxFileUploadsPerDay: 1,
  },

  pro: {
    mt5Accounts: 1,
    aiChatsPerDay: 50,
    tradeStorageDays: 182,
    maxTrades: 500,
    advancedAnalytics: true,
    prioritySupport: false,
    customIntegrations: false,
    aiMLAnalysis: true,
    imageProcessing: false,
    personalizedStrategy: true,
    realTimeAnalytics: true,
    riskManagement: true,
    marketTiming: true,
    maxTradePlans: 25,
    exportData: true,
    shareReports: true,
    alerts: true,
    customizeView: true,
    tvAlerts: 50,
    tvBacktests: 20,
    tvPatterns: 50,
    tvScreener: true,
    tvBroker: true,
    maxFileUploadsPerDay: 10,
  },
  plus: {
    mt5Accounts: 3,
    aiChatsPerDay: 200,
    tradeStorageDays: 365,
    maxTrades: 2000,
    advancedAnalytics: true,
    prioritySupport: true,
    customIntegrations: false,
    aiMLAnalysis: true,
    imageProcessing: true,
    personalizedStrategy: true,
    realTimeAnalytics: true,
    riskManagement: true,
    marketTiming: true,
    maxTradePlans: 100,
    exportData: true,
    shareReports: true,
    alerts: true,
    customizeView: true,
    tvAlerts: 200,
    tvBacktests: 100,
    tvPatterns: 200,
    tvScreener: true,
    tvBroker: true,
    maxFileUploadsPerDay: 10,
  },
  elite: {
    mt5Accounts: -1, // unlimited
    aiChatsPerDay: -1, // unlimited
    tradeStorageDays: -1, // unlimited
    maxTrades: -1, // unlimited
    advancedAnalytics: true,
    prioritySupport: true,
    customIntegrations: true,
    aiMLAnalysis: true,
    imageProcessing: true,
    personalizedStrategy: true,
    realTimeAnalytics: true,
    riskManagement: true,
    marketTiming: true,
    maxTradePlans: -1,
    exportData: true,
    shareReports: true,
    alerts: true,
    customizeView: true,
    tvAlerts: -1,
    tvBacktests: -1,
    tvPatterns: -1,
    tvScreener: true,
    tvBroker: true,
    maxFileUploadsPerDay: -1,
  }
};

export interface UserPlan {
  type: PlanType;
  isActive: boolean;
  expiresAt?: Date;
  features: string[];
}

// Client-safe version - database logic moved to API routes
export async function getUserPlan(userId: string): Promise<UserPlan> {
  if (!userId) {
    return {
      type: 'free',
      isActive: true,
      features: []
    };
  }

  // For client-side usage, return default plan
  // Database queries should be done via API routes
  return {
    type: 'free',
    isActive: true,
    features: []
  };
}

// Accepts either a UserPlan object or a PlanType string for convenience
export function canAccessMT5(plan: UserPlan | PlanType): boolean {
  const type = typeof plan === 'string' ? plan : plan.type;
  return PLAN_LIMITS[type].mt5Accounts > 0 || PLAN_LIMITS[type].mt5Accounts === -1;
}

export function getMT5AccountLimit(plan: UserPlan | PlanType): number {
  const type = typeof plan === 'string' ? plan : plan.type;
  return PLAN_LIMITS[type].mt5Accounts;
}

export function canAccessFeature(plan: UserPlan | PlanType, feature: keyof PlanLimits): boolean {
  const type = typeof plan === 'string' ? plan : plan.type;
  const limit = PLAN_LIMITS[type][feature];
  return limit === true || limit === -1 || (typeof limit === 'number' && limit > 0);
}

export function getUpgradeMessage(plan: UserPlan | PlanType, feature: string): string {
  const currentPlan = (typeof plan === 'string' ? plan : plan.type);
  const upgradeOptions = getUpgradeOptions(currentPlan);

  return `🚀 **Upgrade Required**\n\nYou're currently on the **${currentPlan.toUpperCase()}** plan, which doesn't include ${feature}.\n\n**Upgrade to access this feature:**\n${upgradeOptions.map(option => `• **${option.name}**: ${option.description} - $${option.price}/month`).join('\n')}\n\n**Benefits you'll get:**\n${upgradeOptions[0].benefits.map(benefit => `• ${benefit}`).join('\n')}`;
}

export function getUpgradeOptions(currentPlan: PlanType): Array<{
  name: string;
  price: number;
  description: string;
  benefits: string[];
}> {
  const options = [];

  if (currentPlan === 'free') {
    options.push({
      name: 'Pro Plan',
      price: 29,
      description: 'Perfect for serious traders',
      benefits: [
        'Advanced analytics & insights',
        '50 AI chats per day',
        '90 days trade storage',
        'Advanced analytics & insights',
        'Priority email support'
      ]
    });
    options.push({
      name: 'Plus Plan',
      price: 79,
      description: 'For professional traders',
      benefits: [
        'Unlimited AI chats',
        '200 AI chats per day',
        '1 year trade storage',
        'Advanced analytics & insights',
        'Priority support',
        'Custom integrations'
      ]
    });
  } else if (currentPlan === 'pro') {
    options.push({
      name: 'Plus Plan',
      price: 79,
      description: 'Unlock unlimited potential',
      benefits: [
        'Unlimited AI chats',
        '200 AI chats per day',
        '1 year trade storage',
        'Priority support',
        'Custom integrations'
      ]
    });
  }

  return options;
}

export function getPlanDisplayName(plan: PlanType): string {
  const names = {
    free: 'Free',
    starter: 'Starter',
    pro: 'Pro',
    plus: 'Plus',
    elite: 'Elite'
  };
  return names[plan];
}

export function getPlanColor(plan: PlanType): string {
  const colors = {
    free: 'text-gray-500',
    starter: 'text-gray-600',
    pro: 'text-blue-500',
    plus: 'text-purple-500',
    elite: 'text-yellow-500'
  };
  return colors[plan];
}

export function normalizePlanType(value: unknown): PlanType {
  if (!value) return 'free';
  const str = String(value).toLowerCase();
  if (str === 'premium') return 'plus';
  if (str === 'basic') return 'free';
  const allowed: PlanType[] = ['free', 'starter', 'pro', 'plus', 'elite'];
  return allowed.includes(str as PlanType) ? (str as PlanType) : 'free';
}

export const PLAN_RANK: Record<PlanType, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  plus: 3,
  elite: 4,
};

export function isPlanAtLeast(plan: PlanType | string | null | undefined, required: PlanType): boolean {
  const normalized = normalizePlanType(plan ?? 'starter');
  return PLAN_RANK[normalized] >= PLAN_RANK[required];
}

export async function resolvePlanTypeForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<PlanType> {
  if (!userId) return 'free';
  const { data, error } = await supabase
    .from('users')
    .select('plan')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('resolvePlanTypeForUser error', error);
    return 'free';
  }

  return normalizePlanType(data?.plan ?? 'free');
}
