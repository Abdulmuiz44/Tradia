"use client";

import React from "react";
import { TradePlanProvider } from "@/context/TradePlanContext";
import TradePlannerTable from "@/components/dashboard/TradePlannerTable";

export default function TradePlannerPage() {
  return (
    <TradePlanProvider>
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold mb-4">Trade Planner</h1>
        <TradePlannerTable />
      </div>
    </TradePlanProvider>
  );
}
