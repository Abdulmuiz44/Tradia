"use client";

import React from "react";
import { TradingAccountProvider } from "@/context/TradingAccountContext";
import { TradeProvider } from "@/context/TradeContext";
import TradeJournal from "@/components/dashboard/TradeJournal";

export default function TradeJournalPage() {
  return (
    <TradingAccountProvider>
      <TradeProvider>
        <div className="min-h-screen bg-[#061226] p-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-white mb-6">Trade Journal</h1>
            <TradeJournal />
          </div>
        </div>
      </TradeProvider>
    </TradingAccountProvider>
  );
}
