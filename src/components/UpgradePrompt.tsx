// src/components/UpgradePrompt.tsx
"use client";

import React, { useState } from "react";
import { Crown, X, ArrowRight, Check, RefreshCw } from "lucide-react";
import { PlanType, getUpgradeMessage, getPlanDisplayName } from "@/lib/planAccess";

interface UpgradePromptProps {
  currentPlan: PlanType;
  feature: string;
  onUpgrade: (plan: PlanType) => void;
  onClose: () => void;
  className?: string;
}

export default function UpgradePrompt({
  currentPlan,
  feature,
  onUpgrade,
  onClose,
  className = ""
}: UpgradePromptProps) {
  const [upgrading, setUpgrading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('pro');

  const upgradeMessage = getUpgradeMessage({ type: currentPlan, isActive: true, features: [] }, feature);

  const plans = [
    {
      type: 'pro' as PlanType,
      name: 'Pro',
      price: 9,
      yearlyPrice: 90,
      description: 'Perfect for serious traders',
      features: [
        'Advanced analytics',
        '50 AI chats per day',
        '90 days trade storage',
        'Advanced analytics & insights',
        'Personalized strategy recommendations',
        'Risk management analysis & optimization',
        'Market timing and entry/exit recommendations',
        'Priority email support'
      ],
      popular: false
    },
    {
      type: 'plus' as PlanType,
      name: 'Plus',
      price: 19,
      yearlyPrice: 190,
      description: 'For professional traders',
      features: [
        'Unlimited AI chats',
        '200 AI chats per day',
        '1 year trade storage',
        'Advanced analytics & insights',
        'Image processing for trade screenshots',
        'Real-time performance analytics and insights',
        'Tradia Predict with Mistral AI (Plus & Elite only)',
        'Priority support',
        'Custom integrations'
      ],
      popular: true
    },
    {
      type: 'elite' as PlanType,
      name: 'Elite',
      price: 39,
      yearlyPrice: 390,
      description: 'Ultimate trading experience',
      features: [
        'Custom integrations',
        'Unlimited AI chats',
        'Unlimited trade storage',
        'All premium features',
        'All AI features included',
        'Tradia Predict with enhanced Mistral predictions',
        'Dedicated support',
        'Custom integrations',
        'API access'
      ],
      popular: false
    }
  ];

  // Filter plans based on current plan
  const availablePlans = plans.filter(plan => {
    if (currentPlan === 'starter') return true;
    if (currentPlan === 'pro') return plan.type !== 'pro';
    if (currentPlan === 'plus') return plan.type === 'elite';
    return false;
  });

  const handleUpgrade = async (planType: PlanType) => {
    setUpgrading(true);
    try {
      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planType,
          successUrl: `${window.location.origin}/dashboard/billing?success=true`,
          cancelUrl: `${window.location.origin}/dashboard/billing?canceled=true`
        })
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.checkoutUrl;
      } else {
        console.warn('Failed to create checkout session.');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${className}`}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="bg-white rounded-xl shadow-2xl">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 rounded-t-xl">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 mb-4">
              <Crown className="w-8 h-8 text-yellow-300" />
              <div>
                <h2 className="text-2xl font-bold">Upgrade to Unlock Premium Features</h2>
                <p className="text-blue-100 mt-1">
                  You&apos;re currently on the <span className="font-semibold">{getPlanDisplayName(currentPlan)} Plan</span>
                </p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-sm text-blue-100">
                Unlock <span className="font-semibold text-white">{feature}</span> and many more premium features to take your trading to the next level.
              </p>
            </div>
          </div>

          {/* Plans */}
          <div className="p-8">
            <div className="grid md:grid-cols-3 gap-6">
              {availablePlans.map((plan) => (
                <div
                  key={plan.type}
                  className={`relative bg-white border-2 rounded-xl p-6 transition-all duration-300 hover:shadow-lg ${
                    plan.popular
                      ? 'border-purple-500 shadow-purple-100'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-purple-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <div className="mb-2">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                        <span className="text-gray-600">/month</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        or ${plan.yearlyPrice}/year
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{plan.description}</p>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleUpgrade(plan.type)}
                    disabled={upgrading}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                      plan.popular
                        ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    } disabled:bg-gray-600 disabled:cursor-not-allowed`}
                  >
                    {upgrading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Upgrade to {plan.name}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Current Plan Benefits Reminder */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Your Current {getPlanDisplayName(currentPlan)} Plan Includes:</h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <strong>Advanced Features:</strong> {currentPlan === 'starter' ? 'Basic' : currentPlan === 'pro' ? 'Standard' : currentPlan === 'plus' ? 'Professional' : 'Elite'}
                </div>
                <div>
                  <strong>AI Chats:</strong> {currentPlan === 'starter' ? '10/day' : currentPlan === 'pro' ? '50/day' : currentPlan === 'plus' ? '200/day' : 'Unlimited'}
                </div>
                <div>
                  <strong>Trade Storage:</strong> {currentPlan === 'starter' ? '45 days' : currentPlan === 'pro' ? '182 days' : currentPlan === 'plus' ? '1 year' : 'Unlimited'}
                </div>
                <div>
                  <strong>Advanced Analytics:</strong> {currentPlan === 'starter' ? 'No' : 'Yes'}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 mb-4">
                All plans include a 30-day money-back guarantee. Cancel anytime.
              </p>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 font-medium"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact upgrade prompt for inline usage
export function CompactUpgradePrompt({
  currentPlan,
  feature,
  onUpgrade,
  className = ""
}: Omit<UpgradePromptProps, 'onClose'>) {
  const [upgrading, setUpgrading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('pro');

  const handleUpgrade = async (planType: PlanType) => {
    setUpgrading(true);
    setSelectedPlan(planType);
    try {
      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planType,
          successUrl: `${window.location.origin}/dashboard/billing?success=true`,
          cancelUrl: `${window.location.origin}/dashboard/billing?canceled=true`
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to Flutterwave checkout
        window.location.href = data.checkoutUrl;
      } else {
        alert('Failed to create checkout session. Please try again.');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('Failed to process upgrade. Please try again.');
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <div className={`bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <Crown className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="font-medium text-blue-900 mb-1">Premium Feature</h4>
          <p className="text-sm text-blue-700 mb-3">
            {feature} is available on Pro, Plus, and Elite plans.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleUpgrade('pro')}
              disabled={upgrading}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {upgrading && selectedPlan === 'pro' ? 'Processing...' : 'Upgrade to Pro'}
            </button>
            <button
              onClick={() => handleUpgrade('plus')}
              disabled={upgrading}
              className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors disabled:bg-purple-400 disabled:cursor-not-allowed"
            >
              {upgrading && selectedPlan === 'plus' ? 'Processing...' : 'Upgrade to Plus'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
