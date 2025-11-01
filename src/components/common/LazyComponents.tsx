// Lazy-loaded components for code splitting
import React from 'react';
import { withLazyLoading } from './LazyWrapper';

// Lazy load heavy components that aren't needed immediately
export const LazyPricingPage = withLazyLoading(
  () => import('@/components/pricing/PricingPage')
);

export const LazyPricingCard = withLazyLoading(
  () => import('@/components/pricing/PricingCard')
);

export const LazyUpgradeModal = withLazyLoading(
  () => import('@/components/pricing/UpgradeModal')
);

export const LazyUsageDashboard = withLazyLoading(
  () => import('@/components/pricing/UsageDashboard')
);

// Lazy load AI components
export const LazyTradiaAIChat = withLazyLoading(
  () => import('@/components/ai/TradiaAIChat')
);

// Lazy load modal components
export const LazyAddTradeModal = withLazyLoading(
  () => import('@/components/modals/AddTradeModal')
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
