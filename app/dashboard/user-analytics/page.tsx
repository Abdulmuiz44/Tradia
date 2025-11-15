"use client";

import React from "react";
import UserAnalyticsDashboard from "@/components/analytics/UserAnalyticsDashboard";

export default function UserAnalyticsPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold mb-4">User Analytics</h1>
      <UserAnalyticsDashboard />
    </div>
  );
}
