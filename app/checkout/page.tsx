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

// Declare Flutterwave window type
declare global {
  interface Window {
    FlutterwaveCheckout: any;
  }
}

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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("card");
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
      trialDays,
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
      trialDays,
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
      trialDays,
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

  // Load Flutterwave script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.flutterwave.com/v3.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleCreateCheckout = async () => {
    // Validate payment method
    if (selectedPaymentMethod === "lemonsqueezy") {
      notify({
        variant: "warning",
        title: "Coming Soon",
        description: "Lemon Squeezy payment method is coming soon.",
      });
      return;
    }

    // Allow guest checkout: require an email if not authenticated
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
          billingCycle: billing === "yearly" ? "yearly" : "monthly",
          userEmail: effectiveEmail,
          userId: unified.id || undefined,
          trialDays,
          successUrl: `${window.location.origin}/dashboard/billing?success=true`,
          cancelUrl: `${window.location.origin}/dashboard/billing?canceled=true`,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        /* ignore */
      }

      if (!response.ok) {
        const serverMsg = data?.error || `HTTP ${response.status}`;
        console.error("Create checkout failed:", serverMsg);
        notify({
          variant: "destructive",
          title: "Checkout failed",
          description: String(serverMsg),
        });
        return;
      }

      // Initialize Flutterwave payment
      if (!window.FlutterwaveCheckout) {
        notify({
          variant: "destructive",
          title: "Payment unavailable",
          description: "Flutterwave payment gateway failed to load. Please try again.",
        });
        return;
      }

      const flutterwave = window.FlutterwaveCheckout({
        public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || "",
        tx_ref: data.txRef,
        amount: data.amount,
        currency: data.currency || "USD",
        payment_options: "card",
        customer: {
          email: effectiveEmail,
          name: unified.name || "Customer",
        },
        customizations: {
          title: "Tradia Subscription",
          description: `${plan.toUpperCase()} Plan - ${billing === "yearly" ? "Yearly" : "Monthly"}`,
          logo: "https://www.tradiaai.app/logo.png",
        },
        callback: async (response: any) => {
          // Verify transaction on server
          try {
            const verifyResponse = await fetch("/api/payments/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                txRef: data.txRef,
                transaction_id: response.transaction_id,
              }),
            });

            const verifyData = await verifyResponse.json();

            if (verifyResponse.ok && verifyData.success) {
              notify({
                variant: "default",
                title: "Payment Successful",
                description: "Your subscription has been activated.",
              });
              // Redirect to dashboard
              setTimeout(() => {
                router.push("/dashboard/billing?success=true");
              }, 1000);
            } else {
              notify({
                variant: "destructive",
                title: "Payment Verification Failed",
                description: verifyData.error || "Unable to verify payment. Please contact support.",
              });
            }
          } catch (err) {
            console.error("Verification error:", err);
            notify({
              variant: "destructive",
              title: "Verification Error",
              description: "An error occurred while verifying your payment.",
            });
          }
        },
        onclose: () => {
          // User closed modal
          console.log("Payment modal closed");
        },
      });
    } catch (error) {
      console.error("Checkout error:", error);
      notify({
        variant: "destructive",
        title: "Checkout error",
        description: error instanceof Error ? error.message : "Unexpected error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-white text-gray-900 dark:bg-[#0D1117] dark:text-white transition-colors flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-[#0D1117] dark:text-white transition-colors">
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center gap-2 text-gray-300 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {reason === "trial_expired" && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-200">
            Your 30-day free trial has ended. Please upgrade to continue using Tradia.
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-[#0F1623] rounded-lg border border-gray-800">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-2">Checkout</h2>
              <p className="text-gray-400 mb-4">You&apos;re upgrading to {currentPlan.displayName}.</p>

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
                  <label htmlFor="email" className="block text-sm text-gray-300 mb-1">
                    Email for receipt and account
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-[#0B1220] border border-gray-700 rounded px-3 py-2 text-gray-100 outline-none focus:border-blue-500"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    We&apos;ll send your payment receipt and account link to this email.
                  </div>
                </div>
              )}

              <Button onClick={handleCreateCheckout} disabled={isLoading} className="w-full">
                {isLoading ? "Preparing payment..." : "Continue to Payment"}
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
