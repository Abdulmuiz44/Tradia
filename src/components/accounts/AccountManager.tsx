"use client";

import React, { useState } from "react";
import { Plus, Trash2, Edit2, Activity, Wallet, Settings, ChevronRight, Lock, Link as LinkIcon } from "lucide-react";
import { useAccount } from "@/context/AccountContext";
import { useUser } from "@/context/UserContext";
import { PLAN_LIMITS, type PlanType } from "@/lib/planAccess";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Modal from "@/components/ui/Modal";
import type { TradingAccount } from "@/types/account";
import { formatCurrency, getCurrencySymbol } from "@/lib/currency";
import MT5Connect from "@/components/MT5Connect";
import DashboardMetrics from "@/components/DashboardMetrics";

export default function AccountManager() {
  const { accounts, selectedAccount, selectAccount, stats, deleteAccount, loading } = useAccount();
  const { user, plan } = useUser();
  const router = useRouter();
  const [accountToDelete, setAccountToDelete] = useState<TradingAccount | null>(null);
  const [showMT5Modal, setShowMT5Modal] = useState(false);

  // Get plan-specific limits
  const userPlan = (plan as PlanType) || 'starter';
  const planLimits = PLAN_LIMITS[userPlan];
  const maxAccounts = planLimits.maxTradingAccounts === -1 ? Infinity : planLimits.maxTradingAccounts;
  const accountsRemaining = Math.max(0, maxAccounts - accounts.length);
  const canAddAccount = accounts.length < maxAccounts;

  const handleAddAccountClick = () => {
    if (canAddAccount) {
      router.push("/dashboard/accounts/add");
    } else {
      router.push("/dashboard/upgrade");
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    try {
      await deleteAccount(accountId);
      setAccountToDelete(null);
    } catch (err) {
      console.error("Error deleting account:", err);
    }
  };

  const handleSelectAccount = (account: TradingAccount) => {
    selectAccount(account.id);
  };

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Trading Accounts</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your trading accounts and track performance separately</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">
            {accountsRemaining === Infinity ? "Unlimited" : `${accountsRemaining} remaining`}
          </Badge>
          <Button variant="outline" onClick={() => setShowMT5Modal(true)}>
            <LinkIcon size={18} className="mr-2" />
            Connect MT5
          </Button>
          <Button onClick={handleAddAccountClick} disabled={!canAddAccount}>
            <Plus size={18} className="mr-2" />
            New Account
          </Button>
        </div>
      </div>

      {user?.id && (
        <div className="mb-6">
           <DashboardMetrics userId={user.id} />
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Accounts</p>
            <p className="text-2xl font-bold">{stats?.totalAccounts || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats?.activeAccounts || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Trades</p>
            <p className="text-2xl font-bold">{stats?.totalTradeCount || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Current Plan</p>
            <p className="text-2xl font-bold capitalize">{userPlan}</p>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Grid */}
      {accounts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity size={48} className="text-gray-400 dark:text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Trading Accounts Yet</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              Create your first trading account to start tracking your trades and analyzing performance.
            </p>
            <Button onClick={handleAddAccountClick}>
              <Plus size={18} className="mr-2" />
              Create Your First Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => {
            const isSelected = selectedAccount?.id === account.id;
            return (
              <Card
                key={account.id}
                className={`cursor-pointer transition-all hover:shadow-md ${isSelected
                  ? "ring-2 ring-blue-500 dark:ring-blue-400 bg-blue-50 dark:bg-blue-900/20"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
                onClick={() => handleSelectAccount(account)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                        }`}>
                        <Wallet size={20} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{account.name}</CardTitle>
                        <CardDescription>{account.platform}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={account.is_active ? "default" : "secondary"}>
                      {account.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Balance</p>
                      <p className="font-semibold">{formatCurrency(account.account_size, account.currency)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Currency</p>
                      <p className="font-semibold">{account.currency}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Mode</p>
                      <p className="font-semibold capitalize flex items-center gap-1">
                        {account.mode === "broker" && <Lock size={12} />}
                        {account.mode}
                      </p>
                    </div>
                    {account.broker && (
                      <div>
                        <p className="text-muted-foreground">Broker</p>
                        <p className="font-semibold">{account.broker}</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/accounts/${account.id}/edit`);
                      }}
                    >
                      <Edit2 size={14} className="mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAccountToDelete(account);
                      }}
                    >
                      <Trash2 size={14} className="mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upgrade Prompt */}
      {!canAddAccount && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-200">Account Limit Reached</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Upgrade to add more trading accounts ({maxAccounts} max on {userPlan} plan)
              </p>
            </div>
            <Button variant="outline" onClick={() => router.push("/dashboard/upgrade")}>
              Upgrade Plan
              <ChevronRight size={16} className="ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* MT5 Connect Modal */}
      <Modal
        isOpen={showMT5Modal}
        onClose={() => setShowMT5Modal(false)}
        title="Connect MT5 Account"
        description="Link your MT5 account for automatic syncing."
        size="md"
      >
        {user?.id ? (
            <MT5Connect userId={user.id} />
        ) : (
            <div>Loading user data...</div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!accountToDelete}
        onClose={() => setAccountToDelete(null)}
        title="Delete Trading Account"
        description="This will delete the account. Associated trades will be kept but unassociated. This action cannot be undone."
        size="sm"
      >
        {accountToDelete && (
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <p className="font-semibold text-gray-900 dark:text-white">{accountToDelete.name}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {formatCurrency(accountToDelete.account_size, accountToDelete.currency)} {accountToDelete.currency}
            </p>
          </div>
        )}
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setAccountToDelete(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => accountToDelete && handleDeleteAccount(accountToDelete.id)}
          >
            Delete Account
          </Button>
        </div>
      </Modal>
    </div>
  );
}
