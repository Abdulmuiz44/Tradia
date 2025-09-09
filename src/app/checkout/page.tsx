"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

  useEffect(() => {
    if (status === "unauthenticated") {
      const currentUrl = window.location.pathname + window.location.search;
      router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`);
    }
  }, [status, router]);

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
          successUrl: `${window.location.origin}/dashboard/billing?success=true`,
          cancelUrl: `${window.location.origin}/dashboard/billing?canceled=true`,
        }),
      });

      const data: { checkoutUrl?: string; error?: string } = await response.json();

      if (data.checkoutUrl) {
        setCheckoutUrl(data.checkoutUrl);
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error(data.error || "Failed to create checkout");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Failed to create checkout. Please try again.");
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
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      {/* ... UI unchanged ... */}
    </div>
  );
}
