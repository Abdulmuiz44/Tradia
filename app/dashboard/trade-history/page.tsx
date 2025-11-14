"use client";

import React from "react";
import dynamic from "next/dynamic";
import { TradeProvider } from "@/context/TradeContext";

const TradeHistoryTable = dynamic(
  () => import("@/components/dashboard/TradeHistoryTable"),
  { ssr: false }
);

export default function TradeHistoryPage() {
  return (
    <TradeProvider>
      <div className="min-h-screen bg-[#061226] p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-6">Trade History</h1>
          <TradeHistoryTable />
        </div>
      </div>
    </TradeProvider>
  );
}
