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
import { useUnifiedAuth } from "@/lib/unifiedAuth";

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
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("card");
  const [email, setEmail] = useState<string>("");

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

  // Initialize email from any available auth context
  useEffect(() => {
    if (unified.email && !email) setEmail(unified.email);
  }, [unified.email]);

  const handleCreateCheckout = async () => {
    // Allow guest checkout: require an email if not authenticated
    const effectiveEmail = unified.email || email;
    if (!effectiveEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(effectiveEmail)) {
      notify({ variant: 'warning', title: 'Email required', description: 'Enter a valid email to continue to payment.' });
      return;
    }
    setIsLoading(true);
    try {
      notify({ variant: 'info', title: 'Preparing checkout', description: 'Redirecting to Flutterwave...' });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const response = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planType: plan,
          paymentMethod: selectedPaymentMethod,
          billingCycle: billing === 'yearly' ? 'yearly' : 'monthly',
          userEmail: effectiveEmail,
          userId: unified.id || undefined,
          successUrl: `${window.location.origin}/dashboard/billing?success=true`,
          cancelUrl: `${window.location.origin}/dashboard/billing?canceled=true`,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

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

  // Do not gate the page; allow guest checkout with email input

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

              {/* Payment method selection */}
              <div className="mb-6">
                <PaymentMethodSelector
                  selectedMethod={selectedPaymentMethod}
                  onMethodChange={setSelectedPaymentMethod}
                />
              </div>

              {/* Guest email input when not authenticated */}
              {!unified.isAuthenticated && (
                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm text-gray-300 mb-1">Email for receipt and account</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-[#0B1220] border border-gray-700 rounded px-3 py-2 text-gray-100 outline-none focus:border-blue-500"
                  />
                  <div className="text-xs text-gray-500 mt-1">We’ll send your payment receipt and account link to this email.</div>
                </div>
              )}

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
}

