"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useNotification } from "@/context/NotificationContext";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Shield, ArrowLeft } from "lucide-react";
import { useUnifiedAuth } from "@/lib/unifiedAuth";
import LayoutClient from "@/components/LayoutClient";
import { NotificationProvider } from "@/context/NotificationContext";

// LemonSqueezy is loaded via URL redirect, no window declaration needed

interface PlanDetails {
  name: string;
  displayName: string;
  price: number;
  billing: string;
  trialDays: number;
  features: string[];
}

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const unified = useUnifiedAuth();
  const { notify } = useNotification();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState<string>("");

  const plan = (searchParams?.get("plan") as keyof typeof planDetails) || "plus";
  const billing = searchParams?.get("billing") || "monthly";
  const trialDays = parseInt(searchParams?.get("trial") || "3", 10);
  const reason = searchParams?.get("reason");

  const planDetails: Record<string, PlanDetails> = {
    pro: {
      name: "pro",
      displayName: "Pro",
      price: billing === "yearly" ? 90 : 9,
      billing: billing === "yearly" ? "year" : "month",
      trialDays: 0, // No trial
      features: [
        "All Starter features",
        "6 months trade history",
        "Advanced analytics",
        "AI weekly summary",
        "Personalized strategy recommendations",
        "Risk management analysis & optimization",
        "Market timing and entry/exit recommendations",
      ],
    },
    plus: {
      name: "plus",
      displayName: "Plus",
      price: billing === "yearly" ? 190 : 19,
      billing: billing === "yearly" ? "year" : "month",
      trialDays: 0, // No trial
      features: [
        "All Pro features",
        "Unlimited history",
        "Advanced AI features",
        "AI trade reviews & SL/TP suggestions",
        "Image processing for trade screenshots",
        "Real-time performance analytics & insights",
      ],
    },
    elite: {
      name: "elite",
      displayName: "Elite",
      price: billing === "yearly" ? 390 : 39,
      billing: billing === "yearly" ? "year" : "month",
      trialDays: 0, // No trial
      features: [
        "Everything in Plus",
        "Premium AI features",
        "AI strategy builder",
        "Prop-firm dashboard",
        "All AI features included",
      ],
    },
  };

  const currentPlan = planDetails[plan] || planDetails.plus;

  // Initialize email from any available auth context
  useEffect(() => {
    if (unified.email && !email) setEmail(unified.email);
  }, [unified.email, email]);

  // No script loading needed for LemonSqueezy - it's a redirect-based checkout

  const handleCreateCheckout = async () => {
    const { getCheckoutUrl } = await import("@/lib/checkout-urls");

    const effectiveEmail = unified.email || email;
    if (!effectiveEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(effectiveEmail)) {
      notify({
        variant: "warning",
        title: "Email required",
        description: "Enter a valid email to continue to payment.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const billingCycle = billing === "yearly" ? "yearly" : "monthly";
      const checkoutUrl = getCheckoutUrl(plan as "pro" | "plus" | "elite", billingCycle as "monthly" | "yearly");

      // Add email as query parameter for pre-fill
      const urlWithEmail = new URL(checkoutUrl);
      urlWithEmail.searchParams.append("checkout[email]", effectiveEmail);
      if (unified.id) {
        urlWithEmail.searchParams.append("checkout[custom][user_id]", unified.id);
      }

      console.log("Redirecting to LemonSqueezy checkout:", urlWithEmail.toString());
      window.location.href = urlWithEmail.toString();
    } catch (error) {
      console.error("Checkout error:", error);
      notify({
        variant: "destructive",
        title: "Checkout error",
        description: error instanceof Error ? error.message : "Unexpected error",
      });
      setIsLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-white text-gray-900 dark:bg-[#0f1319] dark:text-white transition-colors flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <LayoutClient>
      <NotificationProvider>
        <div className="min-h-screen bg-[var(--surface-primary)] dark:bg-[#0f1319] text-gray-900 dark:text-white transition-colors">
          <div className="max-w-4xl mx-auto p-4 md:p-6">
            <button
              onClick={() => router.back()}
              className="mb-4 inline-flex items-center gap-2 text-[var(--text-secondary)] dark:text-gray-400 hover:text-[var(--text-primary)] dark:hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            {reason === "trial_expired" && (
              <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-700/50 text-red-200 dark:text-red-300">
                Your 30-day free trial has ended. Please upgrade to continue using Tradia.
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-[var(--surface-secondary)] dark:bg-[#161B22] rounded-lg border border-[var(--surface-border)] dark:border-[#2a2f3a]">
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-2 text-[var(--text-primary)] dark:text-white">Complete Your Purchase</h2>
                  <p className="text-[var(--text-secondary)] dark:text-gray-400 mb-6">Secure payment via LemonSqueezy</p>

                  {/* Guest email input when not authenticated */}
                  {!unified.isAuthenticated && (
                    <div className="mb-4">
                      <label htmlFor="email" className="block text-sm text-[var(--text-secondary)] dark:text-gray-400 mb-1">
                        Email for receipt and account
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full bg-[var(--surface-primary)] dark:bg-[#0f1319] border border-[var(--surface-border)] dark:border-gray-700 rounded px-3 py-2 text-[var(--text-primary)] dark:text-gray-100 outline-none focus:border-blue-500"
                      />
                      <div className="text-xs text-[var(--text-muted)] dark:text-gray-500 mt-1">
                        We&apos;ll send your payment receipt and account link to this email.
                      </div>
                    </div>
                  )}

                  <Button onClick={handleCreateCheckout} disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    {isLoading ? "Preparing payment..." : "Continue to Payment"}
                  </Button>

                  <div className="flex items-center gap-3 text-[var(--text-secondary)] dark:text-gray-400 text-sm mt-4">
                    <Shield className="w-4 h-4" />
                    Secure payment powered by Lemon Squeezy
                  </div>
                </div>
              </div>

              <div className="bg-[var(--surface-secondary)] dark:bg-[#161B22] rounded-lg border border-[var(--surface-border)] dark:border-[#2a2f3a]">
                <div className="p-6">
                  <h3 className="font-semibold mb-3 text-[var(--text-primary)] dark:text-white">Plan Summary</h3>
                  <div className="flex items-end gap-2 mb-6">
                    <span className="text-4xl font-bold text-[var(--text-primary)] dark:text-white">${currentPlan.price}</span>
                    <span className="text-[var(--text-secondary)] dark:text-gray-400 mb-1">/ {currentPlan.billing}</span>
                  </div>
                  <ul className="space-y-3">
                    {currentPlan.features.map((f) => (
                      <li key={f} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="font-semibold text-[var(--text-primary)] dark:text-white">
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </NotificationProvider>
    </LayoutClient>
  );
}
