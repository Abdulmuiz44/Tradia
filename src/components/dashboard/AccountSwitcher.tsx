"use client";

import React, { useState } from "react";
import { useAccount } from "@/context/AccountContext";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronDown, Plus, Edit2, Trash2, Wallet, Lock } from "lucide-react";
import { PLAN_LIMITS, PlanType } from "@/lib/planAccess";

export default function AccountSwitcher() {
    const { accounts, selectedAccount, selectAccount, deleteAccount, loading } = useAccount();
    const { data: session } = useSession();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    // Get user plan and limits
    const userPlan = ((session?.user as any)?.plan || 'starter') as PlanType;
    const planLimits = PLAN_LIMITS[userPlan] || PLAN_LIMITS.starter;
    const maxAccounts = planLimits.maxTradingAccounts === -1 ? Infinity : planLimits.maxTradingAccounts;
    const canAddAccount = accounts.length < maxAccounts;

    // Show loading skeleton instead of null
    if (loading) {
        return (
            <div className="w-full max-w-xs">
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-[#161B22] border border-gray-200 dark:border-[#2a2f3a] rounded-xl animate-pulse">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-[#2a2f3a] rounded-lg"></div>
                    <div className="flex-1">
                        <div className="h-4 bg-gray-200 dark:bg-[#2a2f3a] rounded w-24 mb-1"></div>
                        <div className="h-3 bg-gray-200 dark:bg-[#2a2f3a] rounded w-32"></div>
                    </div>
                    <div className="w-5 h-5 bg-gray-200 dark:bg-[#2a2f3a] rounded"></div>
                </div>
            </div>
        );
    }

    // Show create account button if no accounts
    if (!selectedAccount || accounts.length === 0) {
        return (
            <div className="w-full max-w-xs">
                <button
                    onClick={() => router.push("/dashboard/accounts")}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-[#161B22] border border-dashed border-gray-300 dark:border-[#2a2f3a] rounded-xl hover:border-blue-500/50 hover:bg-gray-200 dark:hover:bg-[#1c2128] transition-all group"
                >
                    <div className="w-8 h-8 bg-gray-200 dark:bg-[#2a2f3a] rounded-lg flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                        <Plus size={16} className="text-gray-500 dark:text-gray-400 group-hover:text-blue-400" />
                    </div>
                    <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                            Create Account
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-600">
                            Set up your trading account
                        </div>
                    </div>
                </button>
            </div>
        );
    }

    const handleAddAccount = () => {
        setIsOpen(false);
        if (canAddAccount) {
            router.push("/dashboard/accounts/add");
        } else {
            // Redirect to upgrade page if limit reached
            router.push("/dashboard/upgrade");
        }
    };

    return (
        <div className="relative inline-block w-full max-w-xs">
            {/* Main button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-[#161B22] border border-gray-200 dark:border-[#2a2f3a] rounded-xl hover:border-gray-400 dark:hover:border-[#3a3f4a] hover:bg-gray-200 dark:hover:bg-[#1c2128] transition-all shadow-sm"
                title={`Current account: ${selectedAccount.name}`}
            >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center border border-gray-200 dark:border-[#2a2f3a]">
                    <Wallet size={16} className="text-blue-500 dark:text-blue-400" />
                </div>
                <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {selectedAccount.name}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                        {selectedAccount.platform} • ${selectedAccount.account_size.toLocaleString()} {selectedAccount.currency}
                    </div>
                </div>
                <ChevronDown
                    size={18}
                    className={`flex-shrink-0 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            {/* Dropdown menu */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-30"
                        onClick={() => setIsOpen(false)}
                        aria-hidden="true"
                    />

                    {/* Menu */}
                    <div
                        className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2a2f3a] rounded-xl shadow-xl z-40 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="max-h-[300px] overflow-y-auto">
                            {accounts.map((account) => (
                                <div
                                    key={account.id}
                                    className={`border-b border-gray-200 dark:border-[#2a2f3a] last:border-b-0 transition ${selectedAccount.id === account.id
                                        ? "bg-blue-50 dark:bg-blue-500/10"
                                        : "hover:bg-gray-50 dark:hover:bg-[#1c2128]"
                                        }`}
                                >
                                    <div className="flex items-center justify-between px-4 py-3 group">
                                        <button
                                            onClick={() => {
                                                selectAccount(account.id);
                                                setIsOpen(false);
                                            }}
                                            className="flex-1 text-left"
                                        >
                                            <div className="font-medium text-sm text-gray-900 dark:text-white">
                                                {account.name}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {account.platform} • ${account.account_size.toLocaleString()} {account.currency}
                                            </div>
                                        </button>

                                        {/* Action buttons */}
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsOpen(false);
                                                    router.push(`/dashboard/accounts/edit/${account.id}`);
                                                }}
                                                className="p-1.5 hover:bg-gray-200 dark:hover:bg-[#2a2f3a] rounded transition"
                                                title="Edit account"
                                                aria-label="Edit account"
                                            >
                                                <Edit2 size={14} className="text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400" />
                                            </button>

                                            {accounts.length > 1 && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeleteConfirm(account.id);
                                                    }}
                                                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-[#2a2f3a] rounded transition"
                                                    title="Delete account"
                                                    aria-label="Delete account"
                                                >
                                                    <Trash2 size={14} className="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Selection indicator */}
                                        {selectedAccount.id === account.id && (
                                            <div className="w-2 h-2 rounded-full bg-blue-500 ml-2"></div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Create new account button */}
                        <div className="border-t border-gray-200 dark:border-[#2a2f3a]"></div>
                        <button
                            onClick={handleAddAccount}
                            className={`w-full px-4 py-3 flex items-center justify-between text-sm font-medium transition ${canAddAccount
                                ? "text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-[#1c2128]"
                                : "text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-[#1c2128]"
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <Plus size={16} />
                                Add New Account
                            </span>
                            {!canAddAccount && (
                                <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                                    <Lock size={12} />
                                    Upgrade
                                </span>
                            )}
                        </button>
                    </div>
                </>
            )}

            {/* Delete confirmation modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4">
                    <div
                        className="absolute inset-0"
                        onClick={() => setDeleteConfirm(null)}
                        aria-hidden
                    />
                    <div className="relative bg-white dark:bg-[#161B22] rounded-xl p-6 max-w-sm w-full z-10 border border-gray-200 dark:border-[#2a2f3a] shadow-2xl">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Delete Account
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            Are you sure you want to delete this trading account? This action cannot be undone.
                        </p>
                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-[#2a2f3a] text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-[#3a3f4a] text-sm font-medium transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        await deleteAccount(deleteConfirm);
                                        setDeleteConfirm(null);
                                        setIsOpen(false);
                                    } catch (error) {
                                        console.error("Error deleting account:", error);
                                    }
                                }}
                                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
