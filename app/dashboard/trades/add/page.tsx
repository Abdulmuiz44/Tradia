"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import LayoutClient from "@/components/LayoutClient";
import { UserProvider } from "@/context/UserContext";
import { useNotification } from "@/context/NotificationContext";
import Spinner from "@/components/ui/spinner";
import { ArrowLeft, Save } from "lucide-react";
import AddTradeForm from "@/components/forms/AddTradeForm";
import type { Trade } from "@/types/trade";

function AddTradeContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { notify } = useNotification();
  const [isLoading, setIsLoading] = useState(false);

  const handleAddTrade = async (tradeData: Partial<Trade>) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tradeData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to add trade");
      }

      const newTrade = await response.json();
      notify({
        variant: "success",
        title: "Trade added successfully",
        description: `Trade for ${tradeData.symbol} has been created.`,
      });
      
      setTimeout(() => router.push("/dashboard/trade-history"), 500);
    } catch (error) {
      notify({
        variant: "destructive",
        title: "Error adding trade",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading") {
    return <Spinner />;
  }

  if (!session) {
    router.push("/login");
    return <Spinner />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0D1117]">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold dark:text-white">Add New Trade</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                Create a new trade entry and track it in your history
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-[#161B22] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <AddTradeForm
            onSubmit={handleAddTrade}
            isLoading={isLoading}
          />
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
            💡 Tip
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-300">
            Fill in all required fields to create a complete trade entry. You can add additional
            details like journal notes and screenshots after creation.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AddTradePage() {
  return (
    <LayoutClient>
      <UserProvider>
        <AddTradeContent />
      </UserProvider>
    </LayoutClient>
  );
}
