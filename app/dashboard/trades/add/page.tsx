"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import LayoutClient from "@/components/LayoutClient";
import { UserProvider } from "@/context/UserContext";
import { useNotification } from "@/context/NotificationContext";
import { useAccount } from "@/context/AccountContext";
import Spinner from "@/components/ui/spinner";
import { ArrowLeft, Save } from "lucide-react";
import AddTradeForm from "@/components/forms/AddTradeForm";
import type { Trade } from "@/types/trade";

function AddTradeContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { notify } = useNotification();
  const { selectedAccount } = useAccount();
  const [isLoading, setIsLoading] = useState(false);

  // Handle screenshot upload via API
  const handleUploadScreenshot = useCallback(async (file: File, type: 'before' | 'after'): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await fetch('/api/upload/screenshot', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload screenshot');
    }

    const data = await response.json();
    return data.url;
  }, []);

  const handleAddTrade = async (tradeData: Partial<Trade>) => {
    // Validate that a trading account is selected
    if (!selectedAccount?.id) {
      notify({
        variant: "destructive",
        title: "No Trading Account Selected",
        description: "Please create and select a trading account before adding trades. Go to the Accounts page to create one.",
      });
      setTimeout(() => router.push("/dashboard/accounts"), 500);
      return;
    }

    setIsLoading(true);
    try {
      const tradeWithAccount = {
        ...tradeData,
        account_id: selectedAccount.id,
      };
      const response = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tradeWithAccount),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to add trade");
      }

      const newTrade = await response.json();
      notify({
        variant: "success",
        title: "Trade added successfully",
        description: `Trade for ${tradeData.symbol} has been created in "${selectedAccount.name}".`,
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

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
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

        {/* Account Warning */}
        {!selectedAccount?.id && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
                  No Trading Account Selected
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-3">
                  You must create and select a trading account before adding trades. Each trade needs to be associated with a specific account.
                </p>
                <button
                  onClick={() => router.push("/dashboard/accounts")}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition"
                >
                  Create Account
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className={`bg-white dark:bg-[#161B22] rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${!selectedAccount?.id ? 'opacity-50 pointer-events-none' : ''}`}>
          <AddTradeForm
            onSubmit={handleAddTrade}
            isLoading={isLoading}
            onUploadScreenshot={handleUploadScreenshot}
          />
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
            💡 Tip
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-300">
            {selectedAccount ? (
              <>Trading to: <strong>{selectedAccount.name}</strong> • {/* */}Fill in all required fields to create a complete trade entry. You can also upload before/after screenshots of your trades.</>
            ) : (
              <>First, create a trading account on the Accounts page, then you can add trades to it.</>
            )}
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
