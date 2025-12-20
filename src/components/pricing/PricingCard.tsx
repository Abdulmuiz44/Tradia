import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Star } from 'lucide-react';
import { PlanType, PLAN_LIMITS } from '@/lib/planAccess';
import { cn } from '@/lib/utils';

export interface PricingCardProps {
  plan: PlanType;
  isPopular?: boolean;
  isCurrentPlan?: boolean;
  onSelectPlan?: (plan: PlanType) => void;
  className?: string;
}

const planDisplayNames: Record<PlanType, string> = {
  starter: 'Starter',
  pro: 'Pro',
  plus: 'Plus',
  elite: 'Elite',
};

const planColors: Record<PlanType, string> = {
  starter: 'text-gray-500 border-gray-200',
  pro: 'text-blue-600 border-blue-200',
  plus: 'text-purple-600 border-purple-200',
  elite: 'text-yellow-600 border-yellow-200',
};

const planBgColors: Record<PlanType, string> = {
  starter: 'bg-gray-50',
  pro: 'bg-blue-50',
  plus: 'bg-purple-50',
  elite: 'bg-yellow-50',
};

export const PricingCard: React.FC<PricingCardProps> = ({
  plan,
  isPopular = false,
  isCurrentPlan = false,
  onSelectPlan,
  className,
}) => {
  const limits = PLAN_LIMITS[plan];
  const displayName = planDisplayNames[plan];
  const isStarter = plan === 'starter';

  const features = [
    {
      category: 'AI Assistant',
      items: [
        `${limits.aiChatsPerDay === -1 ? 'Unlimited' : limits.aiChatsPerDay} AI chats per day`,
        limits.aiMLAnalysis ? 'AI-powered trading analysis' : null,
        limits.personalizedStrategy ? 'Personalized strategy recommendations' : null,
        limits.realTimeAnalytics ? 'Real-time performance analytics' : null,
        limits.riskManagement ? 'Risk management analysis' : null,
        limits.marketTiming ? 'Market timing recommendations' : null,
      ].filter(Boolean),
    },
    {
      category: 'Trading Features',
      items: [
        `${limits.maxTrades === -1 ? 'Unlimited' : limits.maxTrades} trade${limits.maxTrades !== 1 ? 's' : ''} storage`,
        `${limits.tradeStorageDays === -1 ? 'Unlimited' : limits.tradeStorageDays} days trade history`,
        limits.advancedAnalytics ? 'Advanced analytics & insights' : null,
        limits.exportData ? 'Export data & reports' : null,
        limits.shareReports ? 'Share reports' : null,
      ].filter(Boolean),
    },
    {
      category: 'Support & Features',
      items: [
        limits.prioritySupport ? 'Priority support' : 'Email support',
        limits.customIntegrations ? 'Custom integrations' : null,
        limits.imageProcessing ? 'Image processing & analysis' : null,
        limits.alerts ? 'Custom alerts' : null,
        limits.customizeView ? 'Customize dashboard' : null,
      ].filter(Boolean),
    },
  ];

  return (
    <Card className={cn(
      'relative h-full transition-all duration-200 hover:shadow-lg',
      planColors[plan],
      isPopular && 'ring-2 ring-blue-500 shadow-lg scale-105',
      isCurrentPlan && 'ring-2 ring-green-500',
      className
    )}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-blue-600 text-white px-3 py-1">
            <Star className="w-3 h-3 mr-1" />
            Most Popular
          </Badge>
        </div>
      )}

      {isCurrentPlan && (
        <div className="absolute -top-3 right-4">
          <Badge className="bg-green-600 text-white px-2 py-1">
            Current Plan
          </Badge>
        </div>
      )}

      <CardHeader className={cn('text-center pb-2', planBgColors[plan])}>
        <CardTitle className="flex items-center justify-center gap-2 text-xl">
          {plan === 'elite' && <Crown className="w-5 h-5 text-yellow-500" />}
          {displayName}
        </CardTitle>
        <CardDescription className="text-sm">
          {plan === 'starter' && 'Perfect for getting started'}
          {plan === 'pro' && 'For serious traders'}
          {plan === 'plus' && 'For professional traders'}
          {plan === 'elite' && 'Ultimate trading experience'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {plan !== 'starter' && (
          <div className="text-center">
            <div className="text-3xl font-bold">
              ${plan === 'pro' ? '29' : plan === 'plus' ? '79' : '199'}
              <span className="text-sm font-normal text-gray-500">/month</span>
            </div>
          </div>
        )}
        {plan === 'starter' && (
          <div className="text-center">
            <div className="text-3xl font-bold">
              Free
              <span className="text-sm font-normal text-gray-500"> to start</span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {features.map((category, categoryIndex) => (
            <div key={categoryIndex}>
              <h4 className="font-semibold text-sm text-gray-700 mb-2">{category.category}</h4>
              <ul className="space-y-1">
                {category.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>

      <CardFooter>
        <Button
          className={cn(
            'w-full',
            isCurrentPlan && 'bg-gray-100 text-gray-500 hover:bg-gray-100',
            !isCurrentPlan && plan !== 'starter' && 'bg-blue-600 hover:bg-blue-700'
          )}
          variant={plan === 'starter' ? 'outline' : 'default'}
          onClick={() => onSelectPlan?.(plan)}
          disabled={isCurrentPlan}
        >
          {isCurrentPlan ? 'Current Plan' : plan === 'starter' ? 'Get Started' : 'Upgrade'}
        </Button>
      </CardFooter>
    </Card>
  );
};
