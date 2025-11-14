"use client";

import React, { Suspense } from "react";
import { useSession } from "next-auth/react";
import { TradeProvider, useTrade } from "@/context/TradeContext";
import TradeAnalytics from "@/components/dashboard/TradeAnalytics";

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-white">Loading trade analytics...</div>
    </div>
  );
}

function TradeAnalyticsContent() {
  const { data: session } = useSession();
  const { trades } = useTrade();

  // Check admin status
  const isAdmin = session?.user?.email === "abdulmuizproject@gmail.com" ||
                  session?.user?.email?.includes("abdulmuizproject@gmail.com") || false;

  return (
    <div className="min-h-screen bg-[#061226] p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Trade Analytics</h1>
        <Suspense fallback={<LoadingFallback />}>
          <TradeAnalytics trades={trades} session={session} isAdmin={isAdmin} />
        </Suspense>
      </div>
    </div>
  );
}

export default function TradeAnalyticsPage() {
  return (
    <TradeProvider>
      <TradeAnalyticsContent />
    </TradeProvider>
  );
}
