"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount } from "@/context/AccountContext";
import { useSession } from "next-auth/react";
import { ChevronDown, Plus, Check, Wallet, Lock, Settings } from "lucide-react";
import { PLAN_LIMITS, PlanType } from "@/lib/planAccess";

export default function AccountSwitcher() {
    const { accounts, selectedAccount, selectAccount, loading } = useAccount();
    const { data: session } = useSession();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Get user plan and limits
    const userPlan = ((session?.user as any)?.plan || 'starter') as PlanType;
    const planLimits = PLAN_LIMITS[userPlan] || PLAN_LIMITS.starter;
    const maxAccounts = planLimits.maxTradingAccounts === -1 ? Infinity : planLimits.maxTradingAccounts;
    const canAddAccount = accounts.length < maxAccounts;

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Handle account selection with global refresh
    const handleSelectAccount = (accountId: string) => {
        selectAccount(accountId);
        setIsOpen(false);
        // Dispatch custom event for global refresh
        window.dispatchEvent(new CustomEvent('accountChanged', { detail: { accountId } }));
    };

    // Show loading skeleton
    if (loading) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-[#161B22] rounded-lg animate-pulse">
                <div className="w-5 h-5 bg-gray-200 dark:bg-[#2a2f3a] rounded"></div>
                <div className="w-24 h-4 bg-gray-200 dark:bg-[#2a2f3a] rounded"></div>
                <div className="w-4 h-4 bg-gray-200 dark:bg-[#2a2f3a] rounded"></div>
            </div>
        );
    }

    // Show create account prompt if no accounts
    if (!selectedAccount || accounts.length === 0) {
        return (
            <Link
                href="/dashboard/accounts/add"
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-[#161B22] hover:bg-gray-200 dark:hover:bg-[#1c2128] rounded-lg border border-dashed border-gray-300 dark:border-[#3a3f4a] transition-colors"
            >
                <Plus size={16} className="text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Create Account</span>
            </Link>
        );
    }

    return (
        <div ref={dropdownRef} className="relative">
            {/* Trigger Button - Vercel style */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-transparent hover:bg-gray-100 dark:hover:bg-[#1c2128] rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-[#2a2f3a]"
            >
                <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Wallet size={12} className="text-white" />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white max-w-[120px] truncate">
                    {selectedAccount.name}
                </span>
                <ChevronDown
                    size={14}
                    className={`text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            {/* Dropdown Menu - Vercel style */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2a2f3a] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* Account List */}
                    <div className="max-h-[280px] overflow-y-auto py-1">
                        {accounts.map((account) => {
                            const isSelected = selectedAccount.id === account.id;
                            return (
                                <button
                                    key={account.id}
                                    onClick={() => handleSelectAccount(account.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isSelected
                                        ? "bg-blue-50 dark:bg-blue-900/20"
                                        : "hover:bg-gray-50 dark:hover:bg-[#1c2128]"
                                        }`}
                                >
                                    {/* Account Icon */}
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected
                                        ? "bg-gradient-to-br from-blue-500 to-purple-600"
                                        : "bg-gray-100 dark:bg-[#2a2f3a]"
                                        }`}>
                                        <Wallet size={14} className={isSelected ? "text-white" : "text-gray-500 dark:text-gray-400"} />
                                    </div>

                                    {/* Account Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                                {account.name}
                                            </span>
                                            {account.mode === "broker" && (
                                                <span className="text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded">
                                                    API
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {account.platform} • ${account.account_size.toLocaleString()} {account.currency}
                                        </div>
                                    </div>

                                    {/* Selection Indicator */}
                                    {isSelected && (
                                        <Check size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-200 dark:border-[#2a2f3a]" />

                    {/* Actions */}
                    <div className="py-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                                router.push(canAddAccount ? "/dashboard/accounts/add" : "/dashboard/upgrade");
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#1c2128] transition-colors text-left"
                        >
                            <Plus size={16} className="text-gray-500 dark:text-gray-400" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Add Account</span>
                            {!canAddAccount && (
                                <Lock size={12} className="text-amber-500 ml-auto" />
                            )}
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                                router.push("/dashboard/accounts");
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#1c2128] transition-colors text-left"
                        >
                            <Settings size={16} className="text-gray-500 dark:text-gray-400" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Manage Accounts</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
