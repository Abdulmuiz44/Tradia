"use client";

import React from "react";
import { useAccount } from "@/context/AccountContext";
import { ChevronDown, Plus, Edit2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface AccountSelectorProps {
    showCreateButton?: boolean;
    className?: string;
    showActions?: boolean;
}

export default function AccountSelector({
    showCreateButton = true,
    className = "",
    showActions = true,
}: AccountSelectorProps) {
    const { accounts, selectedAccount, selectAccount, deleteAccount, loading } = useAccount();
    const router = useRouter();
    const [isOpen, setIsOpen] = React.useState(false);
    const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null);

    // Show skeleton while loading, but don't disappear
    if (!selectedAccount && !loading) {
        return null;
    }

    return (
        <div className={`relative ${className}`}>
            <button
                onClick={() => !loading && setIsOpen(!isOpen)}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#0f1319] border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition w-full justify-between text-black dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <div className="flex-1 text-left min-w-0">
                    {loading ? (
                        <>
                            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                            <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded mt-1 animate-pulse"></div>
                        </>
                    ) : (
                        <>
                            <div className="text-sm font-medium truncate">{selectedAccount?.name}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                                ${selectedAccount?.account_size.toFixed(2)} {selectedAccount?.currency}
                            </div>
                        </>
                    )}
                </div>
                <ChevronDown
                    size={18}
                    className={`flex-shrink-0 transition text-black dark:text-white ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            {isOpen && !loading && (
                <div className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-[#0f1319] border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg z-50">
                    <div className="max-h-64 overflow-y-auto">
                        {accounts.length === 0 ? (
                            <div className="p-4 text-center text-gray-600 dark:text-gray-400 text-sm">
                                No accounts available
                            </div>
                        ) : (
                            accounts.map((account) => (
                                <div
                                    key={account.id}
                                    className={`border-b border-gray-200 dark:border-gray-800 last:border-b-0 transition ${selectedAccount?.id === account.id
                                        ? "bg-indigo-50 dark:bg-blue-500/10"
                                        : "hover:bg-gray-100 dark:hover:bg-[#0f1319]/50"
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
                                            <div className="font-medium text-sm text-black dark:text-white">{account.name}</div>
                                            <div className="text-xs text-gray-600 dark:text-gray-400">
                                                {account.platform} • ${account.account_size.toFixed(2)}{" "}
                                                {account.currency}
                                            </div>
                                        </button>
                                        {showActions && (
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsOpen(false);
                                                        router.push(`/dashboard/accounts/edit/${account.id}`);
                                                    }}
                                                    className="p-1 hover:bg-gray-300 dark:hover:bg-gray-700 rounded transition"
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
                                                        className="p-1 hover:bg-gray-300 dark:hover:bg-gray-700 rounded transition"
                                                        title="Delete account"
                                                        aria-label="Delete account"
                                                    >
                                                        <Trash2 size={14} className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        {selectedAccount?.id === account.id && (
                                            <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 ml-2"></div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {showCreateButton && accounts.length < 10 && (
                        <>
                            <div className="border-t border-gray-200 dark:border-gray-700"></div>
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    router.push("/dashboard/accounts");
                                }}
                                className="w-full px-4 py-3 flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-[#0f1319] transition text-sm"
                            >
                                <Plus size={16} />
                                New Account
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Delete confirmation modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
                    <div className="absolute inset-0" onClick={() => setDeleteConfirm(null)} aria-hidden />
                    <div className="relative bg-white dark:bg-[#0f1319] rounded-lg p-6 max-w-sm w-full z-10">
                        <h3 className="text-lg font-semibold text-black dark:text-white mb-2">Delete Account</h3>
                        <p className="text-sm text-gray-700 dark:text-gray-400 mb-6">
                            Are you sure you want to delete this trading account? This action cannot be undone.
                        </p>
                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-black dark:text-white text-sm transition"
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
                                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 dark:hover:bg-red-500 text-white text-sm transition"
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
