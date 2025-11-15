"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { TradeProvider, useTrade } from "@/context/TradeContext";
import OverviewCards from "@/components/dashboard/OverviewCards";

function OverviewContent() {
  const { data: session } = useSession();
  const { trades } = useTrade();

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold mb-4">Overview</h1>
      <OverviewCards trades={trades} session={session} />
    </div>
  );
}

export default function OverviewPage() {
  return (
    <TradeProvider>
      <OverviewContent />
    </TradeProvider>
  );
}
