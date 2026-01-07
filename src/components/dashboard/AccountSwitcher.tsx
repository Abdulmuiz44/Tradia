"use client";

import React, { useState } from "react";
import { useAccount } from "@/context/AccountContext";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Edit2, Trash2 } from "lucide-react";

export default function AccountSwitcher() {
    const { accounts, selectedAccount, selectAccount, deleteAccount, loading } = useAccount();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    if (loading || !selectedAccount || accounts.length === 0) {
        return null;
    }

    return (
        <div className="relative inline-block w-full max-w-xs">
            {/* Main button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#0f1319] border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
                title={`Current account: ${selectedAccount.name}`}
            >
                <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {selectedAccount.name}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                        {selectedAccount.platform} • ${selectedAccount.account_size.toFixed(2)} {selectedAccount.currency}
                    </div>
                </div>
                <ChevronDown
                    size={18}
                    className={`flex-shrink-0 text-gray-600 dark:text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
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
                    <div className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-[#0f1319] border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-40 overflow-hidden">
                        <div className="max-h-[300px] overflow-y-auto">
                            {accounts.map((account) => (
                                <div
                                    key={account.id}
                                    className={`border-b border-gray-100 dark:border-gray-800 last:border-b-0 transition ${selectedAccount.id === account.id
                                            ? "bg-blue-50 dark:bg-blue-500/10"
                                            : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
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
                                            <div className="text-xs text-gray-600 dark:text-gray-400">
                                                {account.platform} • ${account.account_size.toFixed(2)} {account.currency}
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
                                                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition"
                                                title="Edit account"
                                                aria-label="Edit account"
                                            >
                                                <Edit2 size={14} className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" />
                                            </button>

                                            {accounts.length > 1 && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeleteConfirm(account.id);
                                                    }}
                                                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition"
                                                    title="Delete account"
                                                    aria-label="Delete account"
                                                >
                                                    <Trash2 size={14} className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Selection indicator */}
                                        {selectedAccount.id === account.id && (
                                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ml-2"></div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Create new account button */}
                        {accounts.length < 10 && (
                            <>
                                <div className="border-t border-gray-100 dark:border-gray-800"></div>
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        router.push("/dashboard/accounts/add");
                                    }}
                                    className="w-full px-4 py-3 flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition text-sm font-medium"
                                >
                                    <Plus size={16} />
                                    Add New Account
                                </button>
                            </>
                        )}
                    </div>
                </>
            )}

            {/* Delete confirmation modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
                    <div
                        className="absolute inset-0"
                        onClick={() => setDeleteConfirm(null)}
                        aria-hidden
                    />
                    <div className="relative bg-white dark:bg-[#0f1319] rounded-xl p-6 max-w-sm w-full z-10 border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Delete Account
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            Are you sure you want to delete this trading account? This action cannot be undone.
                        </p>
                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium transition"
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
