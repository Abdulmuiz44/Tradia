"use client";

import React from "react";
import PositionSizing from "@/components/dashboard/PositionSizing";

export default function PositionSizingPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold mb-4">Position Sizing</h1>
      <PositionSizing />
    </div>
  );
}
