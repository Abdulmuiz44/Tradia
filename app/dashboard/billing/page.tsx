// src/app/dashboard/billing/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CreditCard,
  Calendar,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  X,
  Crown,
  Zap,
  Clock
} from "lucide-react";
import { getPlanDisplayName, PlanType, PLAN_LIMITS } from "@/lib/planAccess";

export default function BillingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentPlan, setCurrentPlan] = useState<PlanType>('starter');
  const [subscription, setSubscription] = useState<any | null>(null);
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Check for success/cancel parameters
  const success = searchParams?.get('success');
  const canceled = searchParams?.get('canceled');
  const txRef = searchParams?.get('tx_ref') || searchParams?.get('txRef') || null;

  const loadBillingData = useCallback(async () => {
    if (!session?.user) return;

    try {
      setLoading(true);

      // Load user profile with plan data
      const profileResponse = await fetch('/api/user/profile');
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setCurrentPlan(profileData.plan || 'starter');
        setUserCreatedAt(profileData.createdAt || null);
      }

      // Load subscription data if any
      try {
        const subscriptionResponse = await fetch('/api/payments/subscriptions');
        if (subscriptionResponse.ok) {
          const data = await subscriptionResponse.json();
          if (data.subscriptions && data.subscriptions.length > 0) {
            setSubscription(data.subscriptions[0]);
          } else {
            setSubscription(null);
          }
        }
      } catch {
        // No subscriptions is fine
        setSubscription(null);
      }

    } catch (error) {
      console.error('Failed to load billing data:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    if (session?.user) {
      void loadBillingData();
    }
  }, [session?.user, loadBillingData]);

  // If redirected from payment provider with success
  useEffect(() => {
    if (!success) return;

    const runVerification = async () => {
      try {
        if (txRef) {
          await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ txRef })
          });
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        await loadBillingData();
      } catch {
        // swallow errors
      }
    };

    void runVerification();
  }, [success, txRef, loadBillingData]);

  const handleUpgrade = async (planType: PlanType) => {
    if (!session?.user?.email) return;

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
        alert('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('Failed to process upgrade');
    } finally {
      setUpgrading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;

    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
      return;
    }

    try {
      const response = await fetch('/api/payments/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: subscription.flutterwave_subscription_id || subscription.lemonsqueezy_subscription_id || undefined,
          planRowId: !subscription?.flutterwave_subscription_id && !subscription?.lemonsqueezy_subscription_id ? subscription.id : undefined,
          action: 'cancel'
        })
      });

      if (response.ok) {
        loadBillingData();
      }
    } catch (error) {
      console.error('Cancel subscription error:', error);
      alert('Failed to cancel subscription');
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPlanPrice = (plan: PlanType) => {
    switch (plan) {
      case 'pro': return '$9/month';
      case 'plus': return '$19/month';
      case 'elite': return '$39/month';
      default: return 'Free';
    }
  };

  const getPlanBadgeStyle = (plan: PlanType) => {
    switch (plan) {
      case 'pro': return 'bg-blue-100 dark:bg-blue-600 text-blue-800 dark:text-blue-100';
      case 'plus': return 'bg-purple-100 dark:bg-purple-600 text-purple-800 dark:text-purple-100';
      case 'elite': return 'bg-emerald-100 dark:bg-emerald-600 text-emerald-800 dark:text-emerald-100';
      default: return 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#0f1319]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!session?.user) {
    router.push('/login');
    return null;
  }

  const planLimits = PLAN_LIMITS[currentPlan];

  const plans = [
    {
      type: 'pro' as PlanType,
      name: 'Pro',
      price: 9,
      features: [
        '5 Trading Accounts',
        '50 AI chats per day',
        '6 months trade storage',
        'Advanced analytics',
        'Email support'
      ],
      popular: false
    },
    {
      type: 'plus' as PlanType,
      name: 'Plus',
      price: 19,
      features: [
        '10 Trading Accounts',
        '200 AI chats per day',
        '1 year trade storage',
        'Advanced analytics',
        'Priority support'
      ],
      popular: true
    },
    {
      type: 'elite' as PlanType,
      name: 'Elite',
      price: 39,
      features: [
        'Unlimited Trading Accounts',
        'Unlimited AI chats',
        'Unlimited trade storage',
        'All premium features',
        'Dedicated support'
      ],
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f1319] text-gray-900 dark:text-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">Billing & Subscription</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your subscription and billing information</p>
        </div>

        {/* Success/Cancel Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-green-800 dark:text-green-300 font-medium">Payment successful!</span>
            </div>
            <p className="text-green-700 dark:text-green-400 mt-1 text-sm">Your subscription has been activated.</p>
          </div>
        )}

        {canceled && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span className="text-amber-800 dark:text-amber-300 font-medium">Payment cancelled</span>
            </div>
            <p className="text-amber-700 dark:text-amber-400 mt-1 text-sm">No charges were made to your account.</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Plan */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-[#161B22] rounded-lg border border-gray-200 dark:border-[#2a2f3a] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Current Plan</h2>
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition font-medium"
                >
                  {currentPlan === 'starter' ? 'Upgrade Plan' : 'Change Plan'}
                </button>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-lg bg-gray-100 dark:bg-[#0f1319]">
                  <Crown className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold capitalize text-gray-900 dark:text-white">
                      {getPlanDisplayName(currentPlan)} Plan
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPlanBadgeStyle(currentPlan)}`}>
                      {currentPlan.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">{getPlanPrice(currentPlan)}</p>
                </div>
              </div>

              {/* Plan Features from actual limits */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {planLimits.maxTradingAccounts === -1 ? 'Unlimited' : planLimits.maxTradingAccounts} Trading Accounts
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {planLimits.aiChatsPerDay === -1 ? 'Unlimited' : planLimits.aiChatsPerDay} AI Chats/Day
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {planLimits.tradeStorageDays === -1 ? 'Unlimited' : `${planLimits.tradeStorageDays} days`} Trade Storage
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {planLimits.advancedAnalytics ? 'Advanced' : 'Basic'} Analytics
                  </span>
                </div>
              </div>

              {/* Active Subscription Details */}
              {subscription && (
                <div className="border-t border-gray-200 dark:border-[#2a2f3a] pt-6">
                  <h4 className="font-medium mb-4 text-gray-900 dark:text-white">Subscription Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Status</span>
                      <div className="flex items-center gap-1 mt-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${subscription.status === 'active'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
                          }`}>
                          {subscription.status === 'active' && <CheckCircle className="w-3 h-3" />}
                          <span className="capitalize">{subscription.status || 'active'}</span>
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Billing Cycle</span>
                      <div className="font-medium text-gray-900 dark:text-white mt-1 capitalize">
                        {subscription.billing_cycle || 'Monthly'}
                      </div>
                    </div>
                    {(subscription.current_period_end || subscription.currentPeriodEnd) && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Next Billing Date</span>
                        <div className="font-medium text-gray-900 dark:text-white mt-1">
                          {formatDate(subscription.current_period_end || subscription.currentPeriodEnd)}
                        </div>
                      </div>
                    )}
                  </div>

                  {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
                    <button
                      onClick={handleCancelSubscription}
                      className="mt-4 px-4 py-2 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition text-sm"
                    >
                      Cancel Subscription
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Account Info */}
          <div className="space-y-6">
            {/* Account Details */}
            <div className="bg-white dark:bg-[#161B22] rounded-lg border border-gray-200 dark:border-[#2a2f3a] p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-500" />
                Account Info
              </h3>
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Account Email</span>
                  <div className="font-medium text-gray-900 dark:text-white">{session.user.email}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Member Since</span>
                  <div className="font-medium text-gray-900 dark:text-white">{formatDate(userCreatedAt)}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Current Plan</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPlanBadgeStyle(currentPlan)}`}>
                      {currentPlan.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-[#161B22] rounded-lg border border-gray-200 dark:border-[#2a2f3a] p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="w-full px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition font-medium flex items-center justify-center gap-2"
                >
                  <Crown className="w-4 h-4" />
                  Upgrade Plan
                </button>
                <button
                  onClick={() => router.push('/dashboard/profile')}
                  className="w-full px-4 py-2.5 bg-gray-100 dark:bg-[#0f1319] text-gray-800 dark:text-white border border-gray-300 dark:border-[#2a2f3a] rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition"
                >
                  Manage Profile
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade Modal */}
        {showUpgradeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowUpgradeModal(false)} />

            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="bg-white dark:bg-[#161B22] rounded-xl shadow-2xl border border-gray-200 dark:border-[#2a2f3a]">
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Choose Your Plan</h2>
                    <button
                      onClick={() => setShowUpgradeModal(false)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                    >
                      <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                      <div
                        key={plan.type}
                        className={`relative p-6 rounded-xl border-2 transition-all duration-300 ${plan.popular
                          ? 'border-black dark:border-white bg-gray-50 dark:bg-[#0f1319]'
                          : 'border-gray-200 dark:border-[#2a2f3a] hover:border-gray-400 dark:hover:border-gray-600'
                          }`}
                      >
                        {plan.popular && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <span className="bg-black dark:bg-white text-white dark:text-black px-4 py-1 rounded-full text-sm font-medium">
                              Most Popular
                            </span>
                          </div>
                        )}

                        <div className="text-center mb-4">
                          <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{plan.name}</h3>
                          <div className="flex items-center justify-center gap-1 mb-2">
                            <span className="text-3xl font-bold text-gray-900 dark:text-white">${plan.price}</span>
                            <span className="text-gray-500 dark:text-gray-400">/month</span>
                          </div>
                        </div>

                        <ul className="space-y-2 mb-6">
                          {plan.features.map((feature, index) => (
                            <li key={index} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>

                        <button
                          onClick={() => handleUpgrade(plan.type)}
                          disabled={upgrading || currentPlan === plan.type}
                          className={`w-full py-2.5 px-4 rounded-lg font-medium transition-colors ${currentPlan === plan.type
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                            : plan.popular
                              ? 'bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100'
                              : 'bg-gray-100 dark:bg-[#0f1319] text-gray-900 dark:text-white border border-gray-300 dark:border-[#2a2f3a] hover:bg-gray-200 dark:hover:bg-gray-800'
                            } disabled:opacity-50`}
                        >
                          {upgrading ? (
                            <span className="flex items-center justify-center gap-2">
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Processing...
                            </span>
                          ) : currentPlan === plan.type ? (
                            'Current Plan'
                          ) : (
                            `Upgrade to ${plan.name}`
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
