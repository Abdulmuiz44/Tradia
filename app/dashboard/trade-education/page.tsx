"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import LayoutClient from "@/components/LayoutClient";
import Spinner from "@/components/ui/spinner";
import TraderEducation from "@/components/dashboard/TraderEducation";
import MobileBackButton from "@/components/ui/MobileBackButton";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

function TradeEducationContent() {
  const { status } = useSession();
  const router = useRouter();

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
            title="Trade Education"
            description="Learn trading strategies, tips, and best practices"
            showBackButton
          />

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            <TraderEducation />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TradeEducationPage() {
  return (
    <LayoutClient>
      <TradeEducationContent />
    </LayoutClient>
  );
}
