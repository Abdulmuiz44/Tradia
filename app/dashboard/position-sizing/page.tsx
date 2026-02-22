"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import LayoutClient from "@/components/LayoutClient";
import { useTrade } from "@/context/TradeContext";
import Spinner from "@/components/ui/spinner";
import PositionSizing from "@/components/dashboard/PositionSizing";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Settings, RefreshCw } from "lucide-react";
import { signOut } from "next-auth/react";
import AnimatedDropdown from "@/components/ui/AnimatedDropdown";
import { Button } from "@/components/ui/button";

import DashboardHeader from "@/components/dashboard/DashboardHeader";

function PositionSizingContent() {
  const { status } = useSession();
  const { refreshTrades } = useTrade();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshTrades();
    } catch (error) {
      console.error("Failed to refresh trades:", error);
    } finally {
      setRefreshing(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen w-full bg-white dark:bg-[#0D1117] transition-colors duration-300 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white dark:bg-[#0D1117] transition-colors duration-300">
      <div className="flex h-screen">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <DashboardHeader
            title="Position Sizing"
            description="Calculate optimal position sizes based on risk management rules"
            showBackButton
            actions={
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing..." : "Refresh Data"}
              </Button>
            }
          />

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            <PositionSizing />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PositionSizingPage(): React.ReactElement {
  return (
    <LayoutClient>
      <PositionSizingContent />
    </LayoutClient>
  );
}
