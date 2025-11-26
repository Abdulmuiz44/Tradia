// Lazy-loaded components for code splitting
import React from 'react';
import { withLazyLoading } from './LazyWrapper';

import type { PricingPageProps } from '@/components/pricing/PricingPage';
import type { PricingCardProps } from '@/components/pricing/PricingCard';
import type { UpgradeModalProps } from '@/components/pricing/UpgradeModal';
import type { UsageDashboardProps } from '@/components/pricing/UsageDashboard';
import type { TradiaAIChatProps } from '@/components/ai/TradiaAIChat';
import type { AddTradeModalProps } from '@/components/modals/AddTradeModal';

// Lazy load heavy components that aren't needed immediately
export const LazyPricingPage = withLazyLoading<PricingPageProps>(
  () => import('@/components/pricing/PricingPage').then(module => ({ default: module.PricingPage }))
);

export const LazyPricingCard = withLazyLoading<PricingCardProps>(
  () => import('@/components/pricing/PricingCard').then(module => ({ default: module.PricingCard }))
);

export const LazyUpgradeModal = withLazyLoading<UpgradeModalProps>(
  () => import('@/components/pricing/UpgradeModal').then(module => ({ default: module.UpgradeModal }))
);

export const LazyUsageDashboard = withLazyLoading<UsageDashboardProps>(
  () => import('@/components/pricing/UsageDashboard').then(module => ({ default: module.UsageDashboard }))
);

// Lazy load AI components
export const LazyTradiaAIChat = withLazyLoading<TradiaAIChatProps>(
  () => import('@/components/ai/TradiaAIChat') // Default export
);

// Lazy load modal components
export const LazyAddTradeModal = withLazyLoading<AddTradeModalProps>(
  () => import('@/components/modals/AddTradeModal') // Default export
);

// Lazy load form components that might be heavy
export const LazyTextarea = React.lazy(() =>
  import('@/components/ui/textarea').then(module => ({ default: module.Textarea }))
);

export const LazyInput = React.lazy(() =>
  import('@/components/ui/input').then(module => ({ default: module.Input }))
);

export const LazyButton = React.lazy(() =>
  import('@/components/ui/button').then(module => ({ default: module.Button }))
);

// Lazy load icons (if they're heavy)
export const LazyIcons = {
  Crown: React.lazy(() => import('lucide-react').then(module => ({ default: module.Crown }))),
  Sparkles: React.lazy(() => import('lucide-react').then(module => ({ default: module.Sparkles }))),
  MessageSquare: React.lazy(() => import('lucide-react').then(module => ({ default: module.MessageSquare }))),
  FileText: React.lazy(() => import('lucide-react').then(module => ({ default: module.FileText }))),
};
