"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { TradingAccount, CreateAccountPayload, UpdateAccountPayload, AccountStats } from "@/types/account";
import { useNotification } from "@/context/NotificationContext";
import { useUser } from "@/context/UserContext";
import { PLAN_LIMITS, type PlanType } from "@/lib/planAccess";

interface AccountContextType {
  accounts: TradingAccount[];
  selectedAccount: TradingAccount | null;
  loading: boolean;
  stats: AccountStats | null;
  selectAccount: (accountId: string) => void;
  createAccount: (payload: CreateAccountPayload) => Promise<TradingAccount>;
  updateAccount: (accountId: string, payload: UpdateAccountPayload) => Promise<TradingAccount>;
  deleteAccount: (accountId: string) => Promise<void>;
  fetchAccounts: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const AccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<TradingAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AccountStats | null>(null);
  const { notify } = useNotification();
  const { user, plan, loading: userLoading } = useUser();
  const supabase = createClientComponentClient();

  // Get max accounts based on user's plan
  const getMaxAccountsForPlan = useCallback((userPlan: PlanType = 'starter'): number => {
    const planLimits = PLAN_LIMITS[userPlan];
    const maxAccounts = planLimits.maxTradingAccounts;
    return maxAccounts === -1 ? Infinity : maxAccounts;
  }, []);

  const MAX_ACCOUNTS = getMaxAccountsForPlan((plan as PlanType) || 'starter');

  const fetchAccounts = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("trading_accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const typedAccounts = (data || []) as TradingAccount[];
      setAccounts(typedAccounts);

      // Auto-select first active account or first account
      if (typedAccounts.length > 0) {
        // Use a functional update or just check the current value if possible. 
        // Since we removed selectedAccount from deps, we can't see the latest value easily in closure unless we trust the state.
        // Actually, we can just set it if it's null.
        setSelectedAccount((prev) => {
          if (prev) return prev; // Don't change if already selected
          const activeAccount = typedAccounts.find((a) => a.is_active);
          return activeAccount || typedAccounts[0];
        });
      }
    } catch (err) {
      console.error("Error fetching accounts:", err);
      notify({
        variant: "destructive",
        title: "Error",
        description: "Failed to load trading accounts",
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, supabase, notify]);

  const refreshStats = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("account_statistics")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;

      const statsData = data || [];
      const totalAccounts = accounts.length;
      const activeAccounts = accounts.filter((a) => a.is_active).length;
      const totalBalance = accounts.reduce((sum, a) => sum + (a.account_size || 0), 0);
      const totalTradeCount = statsData.reduce((sum, stat) => sum + (stat.trade_count || 0), 0);

      setStats({
        totalAccounts,
        activeAccounts,
        totalBalance,
        totalTradeCount,
      });
    } catch (err) {
      console.error("Error refreshing stats:", err);
    }
  }, [user?.id, supabase, accounts]);

  const createAccount = useCallback(
    async (payload: CreateAccountPayload): Promise<TradingAccount> => {
      if (!user?.id) throw new Error("User not authenticated");

      if (accounts.length >= MAX_ACCOUNTS) {
        throw new Error(`Maximum number of accounts (${MAX_ACCOUNTS}) reached`);
      }

      try {
        if (accounts.length >= MAX_ACCOUNTS) {
          const planName = (plan as PlanType) || 'starter';
          const maxAccounts = getMaxAccountsForPlan(planName);
          throw new Error(
            `You have reached the maximum number of accounts (${maxAccounts}) for your ${planName.toUpperCase()} plan. Upgrade your plan to create more accounts.`
          );
        }

        const newAccount = {
          user_id: user.id,
          name: payload.name,
          account_size: payload.account_size,
          currency: payload.currency || "USD",
          platform: payload.platform || "MT5",
          broker: payload.broker,
          mode: payload.mode || "manual",
          is_active: true,
          initial_balance: payload.account_size,
        };

        const { data, error } = await supabase
          .from("trading_accounts")
          .insert([newAccount])
          .select()
          .single();

        if (error) throw error;

        const typedAccount = data as TradingAccount;
        setAccounts((prev) => [typedAccount, ...prev]);
        setSelectedAccount(typedAccount);

        notify({
          variant: "success",
          title: "Account Created",
          description: `Trading account "${payload.name}" created successfully`,
        });

        return typedAccount;
      } catch (err) {
        console.error("Error creating account:", err);
        notify({
          variant: "destructive",
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to create account",
        });
        throw err;
      }
    },
    [user?.id, supabase, accounts.length, plan, MAX_ACCOUNTS, getMaxAccountsForPlan, notify]
  );

  const updateAccount = useCallback(
    async (accountId: string, payload: UpdateAccountPayload): Promise<TradingAccount> => {
      if (!user?.id) throw new Error("User not authenticated");

      try {
        const { data, error } = await supabase
          .from("trading_accounts")
          .update(payload)
          .eq("id", accountId)
          .eq("user_id", user.id)
          .select()
          .single();

        if (error) throw error;

        const typedAccount = data as TradingAccount;
        setAccounts((prev) => prev.map((a) => (a.id === accountId ? typedAccount : a)));

        if (selectedAccount?.id === accountId) {
          setSelectedAccount(typedAccount);
        }

        notify({
          variant: "success",
          title: "Account Updated",
          description: "Trading account updated successfully",
        });

        return typedAccount;
      } catch (err) {
        console.error("Error updating account:", err);
        notify({
          variant: "destructive",
          title: "Error",
          description: "Failed to update account",
        });
        throw err;
      }
    },
    [user?.id, supabase, selectedAccount, notify]
  );

  const deleteAccount = useCallback(
    async (accountId: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      try {
        const { error } = await supabase
          .from("trading_accounts")
          .delete()
          .eq("id", accountId)
          .eq("user_id", user.id);

        if (error) throw error;

        setAccounts((prev) => prev.filter((a) => a.id !== accountId));

        if (selectedAccount?.id === accountId) {
          const remaining = accounts.filter((a) => a.id !== accountId);
          setSelectedAccount(remaining.length > 0 ? remaining[0] : null);
        }

        notify({
          variant: "success",
          title: "Account Deleted",
          description: "Trading account deleted successfully",
        });
      } catch (err) {
        console.error("Error deleting account:", err);
        notify({
          variant: "destructive",
          title: "Error",
          description: "Failed to delete account",
        });
        throw err;
      }
    },
    [user?.id, supabase, accounts, selectedAccount, notify]
  );

  const selectAccount = useCallback((accountId: string) => {
    const account = accounts.find((a) => a.id === accountId);
    if (account) {
      setSelectedAccount(account);
      // Store in localStorage for persistence across page reloads
      if (typeof window !== "undefined") {
        localStorage.setItem("selectedAccountId", accountId);
      }
    }
  }, [accounts]);

  // Load accounts on mount and when user changes
  useEffect(() => {
    if (userLoading) return;

    if (user?.id) {
      fetchAccounts();
    } else {
      setAccounts([]);
      setLoading(false);
    }
  }, [user?.id, userLoading, fetchAccounts]);

  // Restore selected account from localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && accounts.length > 0) {
      const savedId = localStorage.getItem("selectedAccountId");
      if (savedId) {
        const saved = accounts.find((a) => a.id === savedId);
        if (saved) {
          setSelectedAccount(saved);
        }
      }
    }
  }, [accounts]);

  // Refresh stats when accounts change
  useEffect(() => {
    if (accounts.length > 0) {
      refreshStats();
    }
  }, [accounts, refreshStats]);

  return (
    <AccountContext.Provider
      value={{
        accounts,
        selectedAccount,
        loading,
        stats,
        selectAccount,
        createAccount,
        updateAccount,
        deleteAccount,
        fetchAccounts,
        refreshStats,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
};

export const useAccount = () => {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error("useAccount must be used within AccountProvider");
  }
  return context;
};
