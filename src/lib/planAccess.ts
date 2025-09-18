// src/lib/planAccess.ts
// Plan-based access control system (Flutterwave-backed billing)

export type PlanType = 'starter' | 'pro' | 'plus' | 'elite' | 'free';

export interface PlanLimits {
  mt5Accounts: number;
  aiChatsPerDay: number;
  tradeStorageDays: number;
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
  customizeView: boolean; // Enable customize view
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    mt5Accounts: 0,
    aiChatsPerDay: 5,
    tradeStorageDays: 30,
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
  },
  starter: {
    mt5Accounts: 0,
    aiChatsPerDay: 5,
    tradeStorageDays: 30,
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
  },
  pro: {
    mt5Accounts: 1,
    aiChatsPerDay: 50,
    tradeStorageDays: 182,
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
  },
  plus: {
    mt5Accounts: 3,
    aiChatsPerDay: 200,
    tradeStorageDays: 365,
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
  },
  elite: {
    mt5Accounts: -1, // unlimited
    aiChatsPerDay: -1, // unlimited
    tradeStorageDays: -1, // unlimited
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
      type: 'starter',
      isActive: true,
      features: []
    };
  }

  // For client-side usage, return default plan
  // Database queries should be done via API routes
  return {
    type: 'starter',
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

function getUpgradeOptions(currentPlan: PlanType): Array<{
  name: string;
  price: number;
  description: string;
  benefits: string[];
}> {
  const options = [];

  if (currentPlan === 'free' || currentPlan === 'starter') {
    options.push({
      name: 'Pro Plan',
      price: 29,
      description: 'Perfect for serious traders',
      benefits: [
        '1 MT5 account connection',
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
        '3 MT5 account connections',
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
        '3 MT5 account connections',
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
    starter: 'text-gray-500',
    pro: 'text-blue-500',
    plus: 'text-purple-500',
    elite: 'text-yellow-500'
  };
  return colors[plan];
}
