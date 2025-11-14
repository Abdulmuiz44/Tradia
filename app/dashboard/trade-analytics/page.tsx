"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { TradeProvider, useTrade } from "@/context/TradeContext";
import TradeAnalytics from "@/components/dashboard/TradeAnalytics";

function TradeAnalyticsContent() {
  const { data: session } = useSession();
  const { trades } = useTrade();

  // Check admin status
  const isAdmin = session?.user?.email === "abdulmuizproject@gmail.com" ||
                  session?.user?.email?.includes("abdulmuizproject@gmail.com") || false;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold mb-4">Trade Analytics</h1>
      <TradeAnalytics trades={trades} session={session} isAdmin={isAdmin} />
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
