"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useNotification } from "@/context/NotificationContext";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, CreditCard, Shield, Clock, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import PaymentMethodSelector from "@/components/payment/PaymentMethodSelector";

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
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("card");

  const plan = (searchParams?.get("plan") as keyof typeof planDetails) || "plus";
  const billing = searchParams?.get("billing") || "monthly";
  const trialDays = parseInt(searchParams?.get("trial") || "3", 10);

  const planDetails: Record<string, PlanDetails> = {
    pro: {
      name: "pro",
      displayName: "Pro",
      price: billing === "yearly" ? 90 : 9,
      billing: billing === "yearly" ? "year" : "month",
      trialDays,
      features: [
        "All Starter features",
        "6 months trade history",
        "3 account connections",
        "AI weekly summary",
      ],
    },
    plus: {
      name: "plus",
      displayName: "Plus",
      price: billing === "yearly" ? 190 : 19,
      billing: billing === "yearly" ? "year" : "month",
      trialDays,
      features: [
        "All Pro features",
        "Unlimited history",
        "5 account connections",
        "AI trade reviews & SL/TP suggestions",
      ],
    },
    elite: {
      name: "elite",
      displayName: "Elite",
      price: billing === "yearly" ? 390 : 39,
      billing: billing === "yearly" ? "year" : "month",
      trialDays,
      features: [
        "Everything in Plus",
        "Unlimited connections",
        "AI strategy builder",
        "Prop-firm dashboard",
      ],
    },
  };

  const currentPlan = planDetails[plan] || planDetails.plus;

  // Do not auto-redirect; show an inline sign-in CTA instead (handled below)

  const handleCreateCheckout = async () => {
    if (!session?.user?.email) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planType: plan,
          paymentMethod: selectedPaymentMethod,
          billingCycle: billing === 'yearly' ? 'yearly' : 'monthly',
          userEmail: session?.user?.email,
          userId: (session?.user as any)?.id,
          successUrl: `${window.location.origin}/dashboard/billing?success=true`,
          cancelUrl: `${window.location.origin}/dashboard/billing?canceled=true`,
        }),
      });

      if (response.status === 401) {
        const currentUrl = window.location.pathname + window.location.search;
        notify({ variant: "warning", title: "Sign in required", description: "Please sign in to continue to payment." });
        router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`);
        return;
      }

      let data: any = null;
      try { data = await response.json(); } catch { /* ignore */ }

      if (response.ok && data?.checkoutUrl) {
        setCheckoutUrl(data.checkoutUrl);
        window.location.href = data.checkoutUrl;
        return;
      }

      const serverMsg = data?.error || `HTTP ${response.status}`;
      console.error("Create checkout failed:", serverMsg);
      notify({ variant: "destructive", title: "Checkout failed", description: String(serverMsg) });
    } catch (error) {
      console.error("Checkout error:", error);
      notify({ variant: "destructive", title: "Checkout error", description: error instanceof Error ? error.message : "Unexpected error" });
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0D1117] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    const currentUrl = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/checkout';
    return (
      <div className="min-h-screen bg-[#0D1117] text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h2 className="text-2xl font-semibold mb-2">Sign in required</h2>
          <p className="text-gray-400 mb-6">Please sign in to continue to payment.</p>
          <a
            href={`/login?redirect=${encodeURIComponent(currentUrl)}`}
            className="inline-block bg-blue-600 hover:bg-blue-700 transition-colors px-4 py-2 rounded"
          >
            Sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center gap-2 text-gray-300 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-[#0F1623] rounded-lg border border-gray-800">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-2">Checkout</h2>
              <p className="text-gray-400 mb-4">You’re upgrading to {currentPlan.displayName}.</p>

              <div className="mb-6">
                <PaymentMethodSelector
                  selectedMethod={selectedPaymentMethod}
                  onMethodChange={setSelectedPaymentMethod}
                />
              </div>

              <Button onClick={handleCreateCheckout} disabled={isLoading} className="w-full">
                {isLoading ? "Redirecting to Flutterwave..." : "Continue to Payment"}
              </Button>

              <div className="flex items-center gap-3 text-gray-400 text-sm mt-4">
                <Shield className="w-4 h-4" />
                Secure payment by Flutterwave
              </div>
            </div>
          </div>

          <div className="bg-[#0F1623] rounded-lg border border-gray-800">
            <div className="p-6">
              <h3 className="font-semibold mb-3">Plan Summary</h3>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-3xl font-bold">${currentPlan.price}</span>
                <span className="text-gray-400">/ {currentPlan.billing}</span>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-gray-300">
                {currentPlan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" /> {f}
                  </li>
                ))}
              </ul>
              {currentPlan.trialDays > 0 && (
                <div className="mt-4 text-xs text-gray-400">
                  Includes a {currentPlan.trialDays}-day free trial.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  const { notify } = useNotification();
}
