// src/lib/chatPlanLimits.ts
// Comprehensive plan limit enforcement for chat features

import { PLAN_LIMITS, PlanType, normalizePlanType } from './planAccess';

export interface ChatPlanLimits {
  maxConversations: number; // -1 for unlimited
  maxMessagesPerDay: number; // -1 for unlimited
  allowedModes: string[];
  maxAttachedTrades: number;
  imageProcessing: boolean;
  voiceInput: boolean;
  exportChat: boolean;
  shareChat: boolean;
}

export const CHAT_PLAN_LIMITS: Record<PlanType, ChatPlanLimits> = {
  starter: {
    maxConversations: 5,
    maxMessagesPerDay: 10,
    allowedModes: ['assistant', 'coach'],
    maxAttachedTrades: 3,
    imageProcessing: false,
    voiceInput: false,
    exportChat: false,
    shareChat: false,
  },
  pro: {
    maxConversations: 25,
    maxMessagesPerDay: 50,
    allowedModes: ['assistant', 'coach', 'mentor'],
    maxAttachedTrades: 10,
    imageProcessing: false,
    voiceInput: true,
    exportChat: true,
    shareChat: true,
  },
  plus: {
    maxConversations: 100,
    maxMessagesPerDay: 200,
    allowedModes: ['assistant', 'coach', 'mentor', 'analyst'],
    maxAttachedTrades: -1, // unlimited
    imageProcessing: true,
    voiceInput: true,
    exportChat: true,
    shareChat: true,
  },
  elite: {
    maxConversations: -1, // unlimited
    maxMessagesPerDay: -1, // unlimited
    allowedModes: ['assistant', 'coach', 'mentor', 'analyst', 'strategist'],
    maxAttachedTrades: -1,
    imageProcessing: true,
    voiceInput: true,
    exportChat: true,
    shareChat: true,
  },
};

export class ChatPlanValidator {
  private plan: PlanType;
  private limits: ChatPlanLimits;

  constructor(plan?: string | null) {
    this.plan = normalizePlanType(plan);
    this.limits = CHAT_PLAN_LIMITS[this.plan];
  }

  /**
   * Check if user can create a new conversation
   */
  canCreateConversation(currentConversationCount: number): {
    allowed: boolean;
    message?: string;
  } {
    if (this.limits.maxConversations === -1) {
      return { allowed: true };
    }

    if (currentConversationCount >= this.limits.maxConversations) {
      return {
        allowed: false,
        message: `You've reached the maximum of ${this.limits.maxConversations} conversations for your ${this.plan.toUpperCase()} plan. Upgrade to create more.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Check if user can access a specific chat mode
   */
  canAccessMode(mode: string): {
    allowed: boolean;
    message?: string;
  } {
    if (this.limits.allowedModes.includes(mode)) {
      return { allowed: true };
    }

    return {
      allowed: false,
      message: `The ${mode} mode is not available on your ${this.plan.toUpperCase()} plan. Upgrade to access this feature.`,
    };
  }

  /**
   * Check if user can send a message (based on daily limit)
   */
  canSendMessage(messagesUsedToday: number): {
    allowed: boolean;
    message?: string;
    remaining?: number;
  } {
    if (this.limits.maxMessagesPerDay === -1) {
      return { allowed: true, remaining: -1 };
    }

    if (messagesUsedToday >= this.limits.maxMessagesPerDay) {
      return {
        allowed: false,
        message: `You've reached your daily limit of ${this.limits.maxMessagesPerDay} messages. Your limit resets at midnight UTC.`,
      };
    }

    return {
      allowed: true,
      remaining: this.limits.maxMessagesPerDay - messagesUsedToday,
    };
  }

  /**
   * Check if user can attach trades to a message
   */
  canAttachTrades(tradeCount: number): {
    allowed: boolean;
    message?: string;
    max: number;
  } {
    const max = this.limits.maxAttachedTrades;
    
    if (max === -1) {
      return { allowed: true, max: -1 };
    }

    if (tradeCount > max) {
      return {
        allowed: false,
        message: `You can attach up to ${max} trades on your ${this.plan.toUpperCase()} plan. Upgrade to attach more.`,
        max,
      };
    }

    return { allowed: true, max };
  }

  /**
   * Check if user can use image processing
   */
  canUseImageProcessing(): {
    allowed: boolean;
    message?: string;
  } {
    if (!this.limits.imageProcessing) {
      return {
        allowed: false,
        message: `Image processing is available only on Plus and Elite plans. Upgrade to analyze trade screenshots.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Check if user can use voice input
   */
  canUseVoiceInput(): {
    allowed: boolean;
    message?: string;
  } {
    if (!this.limits.voiceInput) {
      return {
        allowed: false,
        message: `Voice input is available on Pro, Plus, and Elite plans. Upgrade to use voice features.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Check if user can export chat
   */
  canExportChat(): {
    allowed: boolean;
    message?: string;
  } {
    if (!this.limits.exportChat) {
      return {
        allowed: false,
        message: `Chat export is available on Pro, Plus, and Elite plans. Upgrade to export conversations.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Check if user can share chat
   */
  canShareChat(): {
    allowed: boolean;
    message?: string;
  } {
    if (!this.limits.shareChat) {
      return {
        allowed: false,
        message: `Chat sharing is available on Pro, Plus, and Elite plans. Upgrade to share conversations.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Get current plan limits
   */
  getLimits(): ChatPlanLimits {
    return { ...this.limits };
  }

  /**
   * Get current plan type
   */
  getPlan(): PlanType {
    return this.plan;
  }

  /**
   * Get all available modes for current plan
   */
  getAvailableModes(): string[] {
    return [...this.limits.allowedModes];
  }

  /**
   * Get upgrade recommendation
   */
  getUpgradeRecommendation(feature: string): string {
    const upgrades: Record<string, Record<PlanType, string>> = {
      imageProcessing: {
         starter: 'Upgrade to Plus to unlock image processing',
         pro: 'Upgrade to Plus to unlock image processing',
         plus: 'Already available',
         elite: 'Already available',
       },
       voiceInput: {
         starter: 'Upgrade to Pro to unlock voice input',
         pro: 'Already available',
         plus: 'Already available',
         elite: 'Already available',
       },
       exportChat: {
         starter: 'Upgrade to Pro to unlock chat export',
         pro: 'Already available',
         plus: 'Already available',
         elite: 'Already available',
       },
       mentorMode: {
         starter: 'Upgrade to Pro to unlock Mentor mode',
         pro: 'Already available',
         plus: 'Already available',
         elite: 'Already available',
       },
    };

    return upgrades[feature]?.[this.plan] || 'Upgrade your plan to access this feature';
  }
}

/**
 * Helper function to check if plan has feature
 */
export function planHasFeature(plan: PlanType | string | null, feature: keyof ChatPlanLimits): boolean {
  const validator = new ChatPlanValidator(plan);
  const limits = validator.getLimits();
  const value = limits[feature];

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value > 0 || value === -1; // -1 means unlimited
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return false;
}
