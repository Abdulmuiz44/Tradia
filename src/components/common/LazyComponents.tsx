// Lazy-loaded components for code splitting
import React from 'react';

// Lazy load heavy components that aren't needed immediately
export const LazyPricingPage = React.lazy(
  () => import('@/components/pricing/PricingPage').then(module => ({ default: module.PricingPage }))
);

export const LazyPricingCard = React.lazy(
  () => import('@/components/pricing/PricingCard').then(module => ({ default: module.PricingCard }))
);

export const LazyUpgradeModal = React.lazy(
  () => import('@/components/pricing/UpgradeModal').then(module => ({ default: module.UpgradeModal }))
);

export const LazyUsageDashboard = React.lazy(
  () => import('@/components/pricing/UsageDashboard').then(module => ({ default: module.UsageDashboard }))
);

// Lazy load AI components
export const LazyTradiaAIChat = React.lazy(
  () => import('@/components/ai/TradiaAIChat')
);

// Lazy load modal components
export const LazyAddTradeModal = React.lazy(
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
