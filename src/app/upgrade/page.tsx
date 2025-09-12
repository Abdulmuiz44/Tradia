"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import PricingPlans from "@/components/payment/PricingPlans";

export default function UpgradePage() {
  const { status } = useSession();
  const router = useRouter();
  const search = useSearchParams();

  // If not logged in, send to login preserving redirect back to upgrade
  if (status === "unauthenticated") {
    const currentUrl = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/upgrade';
    router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`);
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      <div className="max-w-6xl mx-auto py-10">
        <h1 className="text-3xl font-extrabold mb-6 text-center">Choose Your Plan</h1>
        <PricingPlans />
      </div>
    </div>
  );
}

