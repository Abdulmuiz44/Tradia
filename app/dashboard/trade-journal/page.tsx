"use client";

import React, { Suspense } from "react";
import { TradeProvider } from "@/context/TradeContext";
import TradeJournal from "@/components/dashboard/TradeJournal";

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-white">Loading trade journal...</div>
    </div>
  );
}

function TradeJournalContent() {
  return (
    <div className="min-h-screen bg-[#061226] p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Trade Journal</h1>
        <Suspense fallback={<LoadingFallback />}>
          <TradeJournal />
        </Suspense>
      </div>
    </div>
  );
}

export default function TradeJournalPage() {
  return (
    <TradeProvider>
      <TradeJournalContent />
    </TradeProvider>
  );
}
