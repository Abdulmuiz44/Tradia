"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import LayoutClient from "@/components/LayoutClient";
import { UserProvider } from "@/context/UserContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { AccountProvider, useAccount } from "@/context/AccountContext";
import { useNotification } from "@/context/NotificationContext";
import AccountForm from "@/components/accounts/AccountForm";
import Spinner from "@/components/ui/spinner";
import type { CreateAccountPayload } from "@/types/account";

function AddAccountContent() {
  const router = useRouter();
  const { createAccount, loading } = useAccount();
  const { notify } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddAccount = async (payload: CreateAccountPayload | any) => {
    setIsSubmitting(true);
    try {
      const accountPayload: CreateAccountPayload = {
        name: payload.name,
        account_size: payload.account_size,
        currency: payload.currency,
        platform: payload.platform,
        broker: payload.broker,
        mode: payload.mode,
        // Prop firm fields
        prop_firm: payload.prop_firm,
        daily_loss_limit: payload.daily_loss_limit,
        max_drawdown: payload.max_drawdown,
        profit_target: payload.profit_target,
        max_trading_days: payload.max_trading_days,
      };

      await createAccount(accountPayload);
      notify({
        variant: "success",
        title: "Account Created",
        description: `Trading account "${accountPayload.name}" has been created successfully.`,
      });
      setTimeout(() => router.push("/dashboard/trade-history"), 500);
    } catch (error) {
      console.error("Error creating account:", error);
      notify({
        variant: "destructive",
        title: "Error creating account",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0D1117]">
      <div className="max-w-2xl mx-auto p-6">
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
            <h1 className="text-3xl font-bold dark:text-white">Add Trading Account</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              Create a new trading account to track trades separately
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-[#161B22] rounded-lg border border-gray-200 dark:border-gray-700 p-8">
          <AccountForm
            onSubmit={handleAddAccount}
            onCancel={() => router.back()}
            isLoading={isSubmitting || loading}
          />
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
            💡 Why Multiple Accounts?
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <li>• Track different trading strategies separately</li>
            <li>• Manage multiple brokers or accounts</li>
            <li>• Compare performance across different account sizes</li>
            <li>• Keep demo and live trading separate</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function AddAccountPage() {
  return <AddAccountContent />;
}
