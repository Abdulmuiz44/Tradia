"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useTrade } from "@/context/TradeContext";
import { useAccount } from "@/context/AccountContext";
import PropFirmDashboard from "@/components/analytics/PropFirmDashboard";
import { CompactUpgradePrompt } from "@/components/UpgradePrompt";

export default function AnalyticsPropPage() {
    const { data: session } = useSession();
    const { accountFilteredTrades: trades } = useTrade();
    const { accounts } = useAccount();

    const rawPlan = String((session?.user as any)?.plan || 'starter').toLowerCase();
    const plan = (rawPlan === 'free' ? 'starter' : rawPlan) as 'starter' | 'pro' | 'plus' | 'elite';

    const hasPlan = (required: string) => {
        const levels = ['starter', 'pro', 'plus', 'elite'];
        return levels.indexOf(plan) >= levels.indexOf(required);
    };

    const totalInternalBalance = accounts.reduce((sum, acc) => sum + (Number(acc.account_size) || 0), 0);
    const totalPnL = trades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
    const currentBalance = totalInternalBalance + totalPnL;

    if (!hasPlan('plus')) {
        return (
            <CompactUpgradePrompt
                currentPlan={plan}
                feature="Prop Firm Dashboard"
                onUpgrade={() => { try { (window as any).location.hash = '#upgrade'; } catch { } }}
                className="max-w-xl mx-auto"
            />
        );
    }

    return (
        <PropFirmDashboard
            trades={trades}
            plan={plan}
            accountBalance={currentBalance}
        />
    );
}
