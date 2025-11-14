"use client";

import React from "react";
import { TradeProvider } from "@/context/TradeContext";
import TradeJournal from "@/components/dashboard/TradeJournal";

export default function TradeJournalPage() {
  return (
    <TradeProvider>
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold mb-4">Trade Journal</h1>
        <TradeJournal />
      </div>
    </TradeProvider>
  );
}
