"use client";

import React, { Suspense } from "react";
import { TradeProvider } from "@/context/TradeContext";
import TradeHistoryTable from "@/components/dashboard/TradeHistoryTable";

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-white">Loading trade history...</div>
    </div>
  );
}

function TradeHistoryContent() {
  return (
    <div className="min-h-screen bg-[#061226] p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Trade History</h1>
        <Suspense fallback={<LoadingFallback />}>
          <TradeHistoryTable />
        </Suspense>
      </div>
    </div>
  );
}

export default function TradeHistoryPage() {
  return (
    <TradeProvider>
      <TradeHistoryContent />
    </TradeProvider>
  );
}
