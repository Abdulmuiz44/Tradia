import { UserTier, Message, PlanLimits } from './types';

// Helper to normalize user plan tier
export function normalizeTier(p: string | undefined): UserTier['type'] {
  if (!p) return 'free';
  const v = p.toLowerCase();
  if (v === 'starter' || v === 'free' || v === 'pro' || v === 'plus' || v === 'elite') return v as UserTier['type'];
  return 'free';
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(func: T, delay: number): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
}

// Check if admin
export function isUserAdmin(email: string): boolean {
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@tradia.com'; // Use env var
  return email === adminEmail;
}

// Check if grok unlocked
export function isGrokUnlocked(tier: UserTier['type'], isAdmin: boolean): boolean {
  return isAdmin || tier === 'pro' || tier === 'plus' || tier === 'elite';
}

// Get onboarding message
export function getOnboardingMessage(
  tier: UserTier['type'],
  mode: 'coach' | 'grok',
  tradeCount: number,
  isAdmin: boolean,
  grokUnlocked: boolean
): string {
  const hasTrades = tradeCount > 0;

  if (isAdmin) {
    return [
      '### Welcome, Admin! Full Access Granted.',
      hasTrades
        ? `I've scanned your ${tradeCount} recent trades. How can I assist with deep insights or system diagnostics today?`
        : 'Feel free to test all features, including Grok\'s advanced capabilities and trade history uploads.',
      'All models and features are unlocked for you.'
    ].join("\n\n");
  }

  if (mode === 'grok' && grokUnlocked) {
    return [
      '### Grok mode is live',
      hasTrades
        ? `I just ran anomaly checks across your ${tradeCount} recent trades.`
        : 'Drop a question or upload a chart and Grok will break it down instantly.',
      'Ask for a bias sweep, forward view, or say "build a playbook" for action steps.'
    ].join("\n\n");
  }

  if (tier === 'plus' || tier === 'elite') {
    return [
      'Welcome back to Tradia Coach.',
      hasTrades
        ? `I already scanned your ${tradeCount} recent trades so we can set the focus for today.`
        : 'Share what you are tackling and we will map the next best move.',
      'Flip into Grok mode whenever you want deep explainability or predictive signals.'
    ].join("\n\n");
  }

  if (tier === 'pro') {
    return [
      'Hey! I am Tradia Coach.',
      hasTrades
        ? `Your last ${tradeCount} trades are queued for a fast performance pulse.`
        : 'Ask for a scorecard, risk tune-up, or mindset reset to get a tailored plan.',
      'Upgrade to Plus when you are ready for Grok anomaly detection and screenshot breakdowns.'
    ].join("\n\n");
  }

  return [
    'Welcome to Tradia Coach.',
    hasTrades
      ? `I pulled highlights from your ${tradeCount} recent trades so you can build momentum faster.`
      : 'Ask anything about performance, risk, or setups and I will respond with a game plan.',
    'Upgrading unlocks Grok mode for explainable deep dives and predictive prompts.'
  ].join("\n\n");
}

// Sanitize input
export function sanitizeInput(input: string): string {
  return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').slice(0, 1000); // Basic XSS and length limit
}

// Get plan limits - aligned with pricing page context
export function getPlanLimits(tier: UserTier['type']): PlanLimits {
  const limits: Record<UserTier['type'], PlanLimits> = {
    free: {
      maxMessagesPerDay: 5, // From PLAN_LIMITS.aiChatsPerDay
      maxFileUploadsPerDay: 0,
      maxFileSizeMB: 0,
      canUploadFiles: false,
      canUseGrok: false,
      canExportChat: false,
      messageHistoryDays: 30, // From PLAN_LIMITS.tradeStorageDays
    },
    starter: {
      maxMessagesPerDay: 5, // Same as free
      maxFileUploadsPerDay: 0,
      maxFileSizeMB: 0,
      canUploadFiles: false,
      canUseGrok: false,
      canExportChat: false,
      messageHistoryDays: 30,
    },
    pro: {
      maxMessagesPerDay: 50, // From PLAN_LIMITS.aiChatsPerDay
      maxFileUploadsPerDay: 5,
      maxFileSizeMB: 10,
      canUploadFiles: true, // Pro can export data (PLAN_LIMITS.exportData: true)
      canUseGrok: true,
      canExportChat: true, // From PLAN_LIMITS.exportData
      messageHistoryDays: 182, // From PLAN_LIMITS.tradeStorageDays (6 months)
    },
    plus: {
      maxMessagesPerDay: 200, // From PLAN_LIMITS.aiChatsPerDay
      maxFileUploadsPerDay: 20,
      maxFileSizeMB: 50,
      canUploadFiles: true,
      canUseGrok: true,
      canExportChat: true, // From PLAN_LIMITS.exportData
      messageHistoryDays: 365, // From PLAN_LIMITS.tradeStorageDays
    },
    elite: {
      maxMessagesPerDay: -1, // Unlimited - From PLAN_LIMITS.aiChatsPerDay
      maxFileUploadsPerDay: -1, // Unlimited
      maxFileSizeMB: 100,
      canUploadFiles: true,
      canUseGrok: true,
      canExportChat: true, // From PLAN_LIMITS.exportData
      messageHistoryDays: -1, // Unlimited - From PLAN_LIMITS.tradeStorageDays
    },
  };
  return limits[tier];
}

// Upload trade history (placeholder)
export async function uploadTradeHistory(file: File): Promise<void> {
  // Placeholder for actual upload logic
  console.log(`Uploading file: ${file.name}`);
  // Simulate upload
  await new Promise(resolve => setTimeout(resolve, 1000));
  // Throw error if needed for testing
  // throw new Error('Upload failed');
}
