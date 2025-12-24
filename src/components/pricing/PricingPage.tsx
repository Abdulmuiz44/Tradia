import React from 'react';
import { PricingCard } from './PricingCard';
import { PlanType } from '@/lib/planAccess';
import { useUser } from '@/context/UserContext';
import { normalizePlanType } from '@/lib/planAccess';

export interface PricingPageProps {
  onSelectPlan?: (plan: PlanType) => void;
  highlightAI?: boolean;
}

export const PricingPage: React.FC<PricingPageProps> = ({
  onSelectPlan,
  highlightAI = true,
}) => {
  const { user } = useUser();
  const currentPlan = normalizePlanType(user?.plan);

  const plans: PlanType[] = ['starter', 'pro', 'plus', 'elite'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-[#0f1319] mb-4">
          Choose Your Trading Plan
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Unlock the full potential of your trading with AI-powered insights,
          advanced analytics, and professional tools tailored for traders at every level.
        </p>
        {highlightAI && (
          <div className="mt-6 inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <span className="text-blue-600 font-semibold">🤖 AI Chat Limits:</span>
            <span className="text-sm text-blue-700">
              Starter: 10/day • Pro: 50/day • Plus: 200/day • Elite: Unlimited
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {plans.map((plan) => (
          <PricingCard
            key={plan}
            plan={plan}
            isPopular={plan === 'plus'}
            isCurrentPlan={plan === currentPlan}
            onSelectPlan={onSelectPlan}
          />
        ))}
      </div>

      <div className="text-center">
        <p className="text-gray-500 text-sm">
          All plans include core trading features. Upgrade anytime with no setup fees.
        </p>
        <p className="text-gray-400 text-xs mt-2">
          Prices in USD, billed monthly. Cancel anytime.
        </p>
      </div>
    </div>
  );
};
