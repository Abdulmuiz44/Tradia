// src/app/dashboard/billing/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CreditCard,
  Calendar,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  X,
  Crown,
  TrendingUp,
  Shield,
  Zap
} from "lucide-react";
import { getPlanDisplayName, getPlanColor, PlanType } from "@/lib/planAccess";

interface Subscription {
  id: string;
  status: 'active' | 'canceled' | 'past_due' | 'incomplete';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  price: {
    amount: number;
    currency: string;
    interval: 'month' | 'year';
  };
}

interface BillingHistory {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  description: string;
  invoiceUrl?: string;
}

export default function BillingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentPlan, setCurrentPlan] = useState<PlanType>('free');
  const [subscription, setSubscription] = useState<any | null>(null);
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('pro');

  // Check for success/cancel parameters
  const success = searchParams?.get('success');
  const canceled = searchParams?.get('canceled');

  useEffect(() => {
    if (session?.user) {
      loadBillingData();
    }
  }, [session]);

  const loadBillingData = async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);

      // Load current plan via API
      const planResponse = await fetch('/api/user/plan');
      if (planResponse.ok) {
        const planData = await planResponse.json();
        setCurrentPlan(planData.plan);
      } else {
        setCurrentPlan('free'); // Default to free if error
      }

      // Load subscription data
      const subscriptionResponse = await fetch('/api/payments/subscriptions');
      if (subscriptionResponse.ok) {
        const data = await subscriptionResponse.json();
        if (data.subscriptions && data.subscriptions.length > 0) {
          setSubscription(data.subscriptions[0]);
        } else {
          setSubscription(null);
        }
      }

      // Load billing history (mock data for now)
      setBillingHistory([
        {
          id: 'inv_001',
          date: '2024-01-15',
          amount: 29,
          currency: 'USD',
          status: 'paid',
          description: 'Pro Plan - Monthly',
          invoiceUrl: '#'
        },
        {
          id: 'inv_002',
          date: '2023-12-15',
          amount: 29,
          currency: 'USD',
          status: 'paid',
          description: 'Pro Plan - Monthly',
          invoiceUrl: '#'
        }
      ]);

    } catch (error) {
      console.error('Failed to load billing data:', error);
    } finally {
      setLoading(false);
    }
  };

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
        // Redirect to Polar checkout
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
          subscriptionId: subscription.flutterwave_subscription_id || undefined,
          planRowId: !subscription?.flutterwave_subscription_id ? subscription.id : undefined,
          action: 'cancel'
        })
      });

      if (response.ok) {
        alert('Subscription cancelled successfully');
        loadBillingData();
      } else {
        alert('Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Cancel subscription error:', error);
      alert('Failed to cancel subscription');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'canceled': return 'text-red-600 bg-red-100';
      case 'past_due': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'canceled': return <X className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!session?.user) {
    router.push('/login');
    return null;
  }

  const plans = [
    {
      type: 'pro' as PlanType,
      name: 'Pro',
      price: 9,
      features: [
        '1 MT5 account connection',
        '50 AI chats per day',
        '90 days trade storage',
        'Advanced analytics & insights',
        'Priority email support'
      ],
      popular: false
    },
    {
      type: 'plus' as PlanType,
      name: 'Plus',
      price: 19,
      features: [
        '3 MT5 account connections',
        '200 AI chats per day',
        '1 year trade storage',
        'Advanced analytics & insights',
        'Priority support',
        'Custom integrations'
      ],
      popular: true
    },
    {
      type: 'elite' as PlanType,
      name: 'Elite',
      price: 39,
      features: [
        'Unlimited MT5 accounts',
        'Unlimited AI chats',
        'Unlimited trade storage',
        'All premium features',
        'Dedicated support',
        'Custom integrations',
        'API access'
      ],
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Billing & Subscription</h1>
          <p className="text-gray-400">Manage your subscription and billing information</p>
        </div>

        {/* Success/Cancel Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-700 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-medium">Payment successful!</span>
            </div>
            <p className="text-green-300 mt-1">Your subscription has been activated.</p>
          </div>
        )}

        {canceled && (
          <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-400 font-medium">Payment cancelled</span>
            </div>
            <p className="text-yellow-300 mt-1">No charges were made to your account.</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Plan */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Current Plan</h2>
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {currentPlan === 'free' ? 'Upgrade Plan' : 'Change Plan'}
                </button>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className={`p-3 rounded-lg ${getPlanColor(currentPlan)}`}>
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold capitalize">{getPlanDisplayName(currentPlan)} Plan</h3>
                  <p className="text-gray-400">
                    {currentPlan === 'free' ? 'Basic features included' :
                     currentPlan === 'pro' ? '$29/month' :
                     currentPlan === 'plus' ? '$79/month' : '$199/month'}
                  </p>
                </div>
              </div>

              {/* Plan Features */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">
                    {currentPlan === 'free' ? '0' : currentPlan === 'pro' ? '1' : currentPlan === 'plus' ? '3' : 'Unlimited'} MT5 Accounts
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">
                    {currentPlan === 'free' ? '5' : currentPlan === 'pro' ? '50' : currentPlan === 'plus' ? '200' : 'Unlimited'} AI Chats/Day
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">
                    {currentPlan === 'free' ? '30 days' : currentPlan === 'pro' ? '90 days' : currentPlan === 'plus' ? '1 year' : 'Unlimited'} Storage
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">
                    {currentPlan === 'free' ? 'Basic' : 'Advanced'} Analytics
                  </span>
                </div>
              </div>

              {/* Subscription Details */}
              {subscription && (
                <div className="border-t border-gray-700 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Subscription Details</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(subscription.status)}`}>
                      {getStatusIcon(subscription.status)}
                      <span className="ml-1 capitalize">{subscription.status}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Next billing:</span>
                      <div className="font-medium">
                        {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">Amount:</span>
                      <div className="font-medium">
                        ${subscription.price.amount}/{subscription.price.interval}
                      </div>
                    </div>
                  </div>

                  {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
                    <button
                      onClick={handleCancelSubscription}
                      className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      Cancel Subscription
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Billing History */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-6">Billing History</h2>

              {billingHistory.length > 0 ? (
                <div className="space-y-4">
                  {billingHistory.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                      <div>
                        <div className="font-medium text-sm">{invoice.description}</div>
                        <div className="text-xs text-gray-400">{invoice.date}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${invoice.amount}</div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          invoice.status === 'paid' ? 'bg-green-900 text-green-300' :
                          invoice.status === 'pending' ? 'bg-yellow-900 text-yellow-300' :
                          'bg-red-900 text-red-300'
                        }`}>
                          {invoice.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No billing history yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upgrade Modal */}
        {showUpgradeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowUpgradeModal(false)} />

            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="bg-gray-800 rounded-xl shadow-2xl">
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Choose Your Plan</h2>
                    <button
                      onClick={() => setShowUpgradeModal(false)}
                      className="p-2 hover:bg-gray-700 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                      <div
                        key={plan.type}
                        className={`relative p-6 rounded-xl border-2 transition-all duration-300 cursor-pointer ${
                          plan.popular
                            ? 'border-purple-500 bg-purple-900/20'
                            : 'border-gray-600 hover:border-gray-500'
                        }`}
                        onClick={() => setSelectedPlan(plan.type)}
                      >
                        {plan.popular && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <span className="bg-purple-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                              Most Popular
                            </span>
                          </div>
                        )}

                        <div className="text-center mb-4">
                          <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                          <div className="flex items-center justify-center gap-1 mb-2">
                            <span className="text-3xl font-bold">${plan.price}</span>
                            <span className="text-gray-400">/month</span>
                          </div>
                        </div>

                        <ul className="space-y-2 mb-6">
                          {plan.features.map((feature, index) => (
                            <li key={index} className="flex items-center gap-2 text-sm">
                              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpgrade(plan.type);
                          }}
                          disabled={upgrading}
                          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                            plan.popular
                              ? 'bg-purple-600 hover:bg-purple-700'
                              : 'bg-blue-600 hover:bg-blue-700'
                          } disabled:bg-gray-600`}
                        >
                          {upgrading ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                              Processing...
                            </>
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
