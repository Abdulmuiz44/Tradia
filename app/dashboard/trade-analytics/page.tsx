"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { TradingAccountProvider } from "@/context/TradingAccountContext";
import { TradeProvider, useTrade } from "@/context/TradeContext";
import TradeAnalytics from "@/components/dashboard/TradeAnalytics";

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
        <TradeAnalytics trades={trades} session={session} isAdmin={isAdmin} />
      </div>
    </div>
  );
}

export default function TradeAnalyticsPage() {
  return (
    <TradingAccountProvider>
      <TradeProvider>
        <TradeAnalyticsContent />
      </TradeProvider>
    </TradingAccountProvider>
  );
}
