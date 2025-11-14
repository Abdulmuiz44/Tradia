"use client";

import React from "react";
import { TradeProvider } from "@/context/TradeContext";
import TradeHistoryTable from "@/components/dashboard/TradeHistoryTable";

export default function TradeHistoryPage() {
  return (
    <TradeProvider>
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold mb-4">Trade History</h1>
        <TradeHistoryTable />
      </div>
    </TradeProvider>
  );
}
