"use client";

import React from "react";
import { TradePlanProvider } from "@/context/TradePlanContext";
import TradePlannerTable from "@/components/dashboard/TradePlannerTable";

export default function TradePlannerPage() {
  return (
    <TradePlanProvider>
      <div className="space-y-6">
        <TradePlannerTable />
      </div>
    </TradePlanProvider>
  );
}
