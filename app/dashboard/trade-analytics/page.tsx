"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useTrade } from "@/context/TradeContext";
import TradeAnalytics from "@/components/dashboard/TradeAnalytics";
import Spinner from "@/components/ui/spinner";

export default function TradeAnalyticsPage() {
  const { data: session } = useSession();
  const { trades } = useTrade();

  // Check admin status
  const isAdmin = session?.user?.email === "abdulmuizproject@gmail.com" ||
                  session?.user?.email?.includes("abdulmuizproject@gmail.com") || false;

  if (!session) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TradeAnalytics trades={trades} session={session} isAdmin={isAdmin} />
    </div>
  );
}
