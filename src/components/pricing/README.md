# Pricing Components

This directory contains reusable components for displaying pricing plans, usage dashboards, and upgrade prompts in the Tradia application.

## Components

### `PricingPage`
Main pricing page component that displays all available plans.

```tsx
import { PricingPage } from '@/components/pricing';

<PricingPage
  onSelectPlan={(plan) => console.log(`Selected: ${plan}`)}
  highlightAI={true} // Shows AI chat limits prominently
/>
```

### `PricingCard`
Individual plan card component.

```tsx
import { PricingCard } from '@/components/pricing';

<PricingCard
  plan="pro"
  isPopular={true}
  isCurrentPlan={false}
  onSelectPlan={(plan) => handleUpgrade(plan)}
/>
```

### `UsageDashboard`
Shows current usage statistics and limits.

```tsx
import { UsageDashboard } from '@/components/pricing';

<UsageDashboard
  currentPlan="free"
  usageStats={{ messages: 3, uploads: 1 }}
/>
```

### `UpgradeModal`
Modal that appears when users hit plan limits.

```tsx
import { UpgradeModal } from '@/components/pricing';

<UpgradeModal
  isOpen={showUpgrade}
  onClose={() => setShowUpgrade(false)}
  currentPlan="free"
  reason="ai-limit"
  onSelectPlan={(plan) => handleUpgrade(plan)}
/>
```

### `PricingExample`
Demo component showing how all components work together.

```tsx
import { PricingExample } from '@/components/pricing';

<PricingExample />
```

## Plan Limits

The components automatically display the correct limits based on the plan configuration in `@/lib/planAccess.ts`:

| Feature | Free | Pro | Plus | Elite |
|---------|------|-----|------|-------|
| AI Chats/Day | 5 | 50 | 200 | Unlimited |
| File Uploads | ❌ | ❌ | ✅ | ✅ | ✅ |
| Export Data | ❌ | ❌ | ✅ | ✅ | ✅ |
| Message History | 30 days | 30 days | 182 days | 365 days | Unlimited |

## Integration

### In AI Chat Component
The components are already integrated into the `TradiaAIChat` component to show upgrade prompts when limits are reached.

### Custom Integration
```tsx
import { useUser } from '@/context/UserContext';
import { normalizePlanType, PLAN_LIMITS } from '@/lib/planAccess';
import { UpgradeModal, UsageDashboard } from '@/components/pricing';

const MyComponent = () => {
  const { user } = useUser();
  const currentPlan = normalizePlanType(user?.plan);
  const limits = PLAN_LIMITS[currentPlan];

  // Show upgrade modal when hitting limits
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (someCondition) {
    setShowUpgrade(true);
  }

  return (
    <>
      <UsageDashboard currentPlan={currentPlan} usageStats={usageStats} />
      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        currentPlan={currentPlan}
        reason="ai-limit"
        onSelectPlan={(plan) => redirectToPayment(plan)}
      />
    </>
  );
};
```

## Styling

The components use Tailwind CSS classes and are designed to be responsive. They integrate with the existing design system and use the same color schemes and spacing.

## Accessibility

All components include proper ARIA labels, keyboard navigation, and screen reader support.
