"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import LayoutClient from "@/components/LayoutClient";
import { UserProvider } from "@/context/UserContext";
import { TradeProvider, useTrade } from "@/context/TradeContext";
import { useNotification } from "@/context/NotificationContext";
import Spinner from "@/components/ui/spinner";
import { ArrowLeft, Upload, Check } from "lucide-react";
import CsvUpload from "@/components/dashboard/CsvUpload";
import type { Trade } from "@/types/trade";

function ImportTradesContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { notify } = useNotification();
  const { refreshTrades } = useTrade();
  const [isLoading, setIsLoading] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const handleImportTrades = async (trades: Partial<Trade>[]) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/trades/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trades }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || "Failed to import trades");
      }

      const result = await response.json();
      setImportedCount(result.count || trades.length);

      // Refresh trades in context to fetch newly imported trades
      try {
        await refreshTrades();
      } catch (e) {
        console.warn("Failed to refresh trades after import:", e);
      }

      notify({
        variant: "success",
        title: "Trades imported successfully",
        description: `${result.count || trades.length} trades have been added to your history.`,
      });

      setTimeout(() => router.push("/dashboard/trade-history"), 1500);
    } catch (error) {
      notify({
        variant: "destructive",
        title: "Error importing trades",
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
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold dark:text-white">Import Trades</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              Import trades from CSV or Excel files and add them to your history
            </p>
          </div>
        </div>

        {/* Content */}
        {importedCount > 0 ? (
          /* Success State */
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-600 rounded-full">
                <Check className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-green-900 dark:text-green-200 mb-2">
              Import Complete!
            </h2>
            <p className="text-green-800 dark:text-green-300 mb-6">
              Successfully imported <span className="font-bold">{importedCount}</span> trades.
              They are now available in your trade history.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push("/dashboard/trade-history")}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                View Trade History
              </button>
              <button
                onClick={() => {
                  setImportedCount(0);
                  window.location.reload();
                }}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Import More
              </button>
            </div>
          </div>
        ) : (
          /* Upload Area */
          <div className="bg-white dark:bg-[#161B22] rounded-lg border border-gray-200 dark:border-gray-700 p-8">
            <CsvUpload
              isOpen={true}
              onClose={() => router.push("/dashboard/trade-history")}
              onImport={handleImportTrades}
            />

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                  📋 Supported Formats
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  <li>• CSV files (.csv)</li>
                  <li>• Excel files (.xlsx, .xls)</li>
                  <li>• Tab-separated (.tsv)</li>
                </ul>
              </div>

              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <h3 className="font-semibold text-purple-900 dark:text-purple-200 mb-2">
                  ✨ Required Columns
                </h3>
                <ul className="text-sm text-purple-800 dark:text-purple-300 space-y-1">
                  <li>• symbol (e.g., EURUSD)</li>
                  <li>• direction (Buy/Sell)</li>
                  <li>• entryPrice</li>
                </ul>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
                  💡 Optional Columns
                </h3>
                <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
                  <li>• stopLossPrice, takeProfitPrice</li>
                  <li>• openTime, closeTime</li>
                  <li>• pnl, outcome</li>
                </ul>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <h3 className="font-semibold text-green-900 dark:text-green-200 mb-2">
                  ⚡ Pro Tip
                </h3>
                <p className="text-sm text-green-800 dark:text-green-300">
                  Export your trades from MetaTrader, TradingView, or your broker and import them here.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ImportTradesPage() {
  return (
    <LayoutClient>
      <UserProvider>
        <TradeProvider>
          <ImportTradesContent />
        </TradeProvider>
      </UserProvider>
    </LayoutClient>
  );
}
