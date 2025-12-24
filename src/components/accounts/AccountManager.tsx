"use client";

import React, { useState } from "react";
import { Plus, Trash2, Edit2, Activity, AlertCircle, Zap } from "lucide-react";
import { useAccount } from "@/context/AccountContext";
import { useUser } from "@/context/UserContext";
import { PLAN_LIMITS, type PlanType } from "@/lib/planAccess";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import type { TradingAccount } from "@/types/account";

export default function AccountManager() {
  const { accounts, selectedAccount, stats, deleteAccount, loading } = useAccount();
  const { plan } = useUser();
  const router = useRouter();
  const [accountToDelete, setAccountToDelete] = useState<TradingAccount | null>(null);
  const [editingAccount, setEditingAccount] = useState<TradingAccount | null>(null);

  // Get plan-specific limits
  const userPlan = (plan as PlanType) || 'starter';
  const planLimits = PLAN_LIMITS[userPlan];
  const maxAccounts = planLimits.maxTradingAccounts === -1 ? Infinity : planLimits.maxTradingAccounts;
  const accountsRemaining = Math.max(0, maxAccounts - accounts.length);

  const handleAddAccountClick = () => {
    router.push("/dashboard/accounts/add");
  };

  const handleDeleteAccount = async (accountId: string) => {
    try {
      await deleteAccount(accountId);
      setAccountToDelete(null);
    } catch (err) {
      console.error("Error deleting account:", err);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading accounts...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Trading Accounts</h1>
            <p className="text-blue-100">Manage your trading accounts and balances</p>
          </div>
          <button
            onClick={handleAddAccountClick}
            disabled={accounts.length >= maxAccounts && maxAccounts !== Infinity}
            className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Plus size={20} />
            New Account
          </button>
        </div>

        {/* Plan Badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-blue-100">
            <span className="capitalize font-semibold">{userPlan}</span> Plan
          </div>
          <div className="text-xs text-blue-200 bg-blue-600/30 px-3 py-1 rounded-full">
            {accountsRemaining === Infinity ? "Unlimited" : `${accountsRemaining} account${accountsRemaining !== 1 ? "s" : ""} remaining`}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-blue-100 text-sm mb-1">Total Accounts</div>
            <div className="text-2xl font-bold">{stats?.totalAccounts || 0}</div>
            <div className="text-xs text-blue-200 mt-1">{maxAccounts === Infinity ? "Unlimited" : `of ${maxAccounts}`}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-blue-100 text-sm mb-1">Active</div>
            <div className="text-2xl font-bold">{stats?.activeAccounts || 0}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-blue-100 text-sm mb-1">Total Balance</div>
            <div className="text-2xl font-bold">${(stats?.totalBalance || 0).toFixed(2)}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-blue-100 text-sm mb-1">Total Trades</div>
            <div className="text-2xl font-bold">{stats?.totalTradeCount || 0}</div>
          </div>
        </div>
      </div>

      {/* Accounts list */}
      {accounts.length === 0 ? (
        <div className="bg-[#0f1319] border border-gray-700 rounded-lg p-12 text-center">
          <Activity size={48} className="mx-auto text-gray-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Trading Accounts Yet</h2>
          <p className="text-gray-400 mb-6">Create your first trading account to get started</p>
          <button
            onClick={handleAddAccountClick}
            className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={20} />
            Create Account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <div
              key={account.id}
              className={`border rounded-lg p-6 transition-all ${selectedAccount?.id === account.id
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-gray-700 bg-[#0f1319] hover:bg-gray-750"
                }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{account.name}</h3>
                  <p className="text-sm text-gray-400">{account.platform}</p>
                </div>
                {account.is_active ? (
                  <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded-full">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded-full">
                    Inactive
                  </span>
                )}
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-400">Account Size:</span>
                  <span className="font-semibold">
                    ${account.account_size.toFixed(2)} {account.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Initial Balance:</span>
                  <span className="text-sm">${account.initial_balance.toFixed(2)}</span>
                </div>
                {account.broker && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Broker:</span>
                    <span className="text-sm">{account.broker}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Mode:</span>
                  <span className="text-sm capitalize">{account.mode}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingAccount(account)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 rounded hover:bg-blue-700 transition text-sm"
                >
                  <Edit2 size={16} />
                  Edit
                </button>
                <button
                  onClick={() => setAccountToDelete(account)}
                  disabled={accounts.length === 1}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-900/30 rounded hover:bg-red-900/50 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {accounts.length >= maxAccounts && maxAccounts !== Infinity && (
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 text-yellow-400 text-sm flex items-start gap-3">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-2">Account Limit Reached</p>
            <p>You have reached the maximum of <strong>{maxAccounts} accounts</strong> for your <strong>{userPlan.toUpperCase()}</strong> plan.</p>
            <button
              onClick={() => router.push("/dashboard/billing")}
              className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-yellow-700 hover:bg-yellow-600 rounded text-sm font-semibold transition"
            >
              <Zap size={14} />
              Upgrade Plan
            </button>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      <Modal
        isOpen={!!accountToDelete}
        onClose={() => setAccountToDelete(null)}
        title="Delete Trading Account"
        description="This will delete the account but keep all associated trades. This action cannot be undone."
        size="sm"
      >
        {accountToDelete && (
          <div className="mt-4 p-3 bg-[#0f1319] rounded">
            <p className="font-semibold">{accountToDelete.name}</p>
            <p className="text-sm text-gray-400">
              ${accountToDelete.account_size.toFixed(2)} {accountToDelete.currency}
            </p>
          </div>
        )}
        <div className="flex items-center justify-end gap-3 mt-4">
          <button
            onClick={() => setAccountToDelete(null)}
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/15"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              accountToDelete && handleDeleteAccount(accountToDelete.id)
            }
            className="px-4 py-2 rounded bg-red-600 hover:bg-red-500"
          >
            Delete Account
          </button>
        </div>
      </Modal>

      {/* Edit Account Modal */}
      {editingAccount && (
        <Modal
          isOpen={!!editingAccount}
          onClose={() => setEditingAccount(null)}
          title="Edit Account"
          size="sm"
        >
          {/* Edit form component can be added here */}
          <p className="text-gray-400">Edit functionality coming soon</p>
        </Modal>
      )}
    </div>
  );
}
