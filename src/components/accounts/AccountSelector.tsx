"use client";

import React from "react";
import { useAccount } from "@/context/AccountContext";
import { ChevronDown, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

interface AccountSelectorProps {
  showCreateButton?: boolean;
  className?: string;
}

export default function AccountSelector({
  showCreateButton = true,
  className = "",
}: AccountSelectorProps) {
  const { accounts, selectedAccount, selectAccount, loading } = useAccount();
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);

  if (loading || !selectedAccount) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-750 transition w-full justify-between"
      >
        <div className="flex-1 text-left min-w-0">
          <div className="text-sm font-medium truncate">{selectedAccount.name}</div>
          <div className="text-xs text-gray-400">
            ${selectedAccount.account_size.toFixed(2)} {selectedAccount.currency}
          </div>
        </div>
        <ChevronDown
          size={18}
          className={`flex-shrink-0 transition ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-50">
          <div className="max-h-64 overflow-y-auto">
            {accounts.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">
                No accounts available
              </div>
            ) : (
              accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => {
                    selectAccount(account.id);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-3 text-left border-b border-gray-800 last:border-b-0 transition ${
                    selectedAccount.id === account.id
                      ? "bg-blue-500/20 border-b border-blue-500"
                      : "hover:bg-gray-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{account.name}</div>
                      <div className="text-xs text-gray-400">
                        {account.platform} • ${account.account_size.toFixed(2)}{" "}
                        {account.currency}
                      </div>
                    </div>
                    {selectedAccount.id === account.id && (
                      <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {showCreateButton && accounts.length < 10 && (
            <>
              <div className="border-t border-gray-700"></div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push("/dashboard/accounts");
                }}
                className="w-full px-4 py-3 flex items-center gap-2 text-blue-400 hover:bg-gray-800 transition text-sm"
              >
                <Plus size={16} />
                New Account
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
