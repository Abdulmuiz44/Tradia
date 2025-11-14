"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useTrade } from "@/context/TradeContext";
import OverviewCards from "@/components/dashboard/OverviewCards";
import Spinner from "@/components/ui/spinner";

export default function OverviewPage() {
  const { data: session } = useSession();
  const { trades } = useTrade();

  if (!session) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <OverviewCards trades={trades} session={session} />
    </div>
  );
}
