"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useTrade } from "@/context/TradeContext";
import { useAccount } from "@/context/AccountContext";
import RiskControlsAndPropSim from "@/components/analytics/RiskControlsAndPropSim";

export default function AnalyticsControlsPage() {
    const { data: session } = useSession();
    const { trades } = useTrade();
    const { accounts } = useAccount();

    const rawPlan = String((session?.user as any)?.plan || 'starter').toLowerCase();
    const plan = (rawPlan === 'free' ? 'starter' : rawPlan) as 'starter' | 'pro' | 'plus' | 'elite';

    // Calculate account balance
    const totalInternalBalance = accounts.reduce((sum, acc) => sum + (Number(acc.account_size) || 0), 0);
    // Do we include PnL? RiskControls uses it for limits. Usually current equity.
    // We'll mimic Overview logic: Initial + PnL
    const totalPnL = trades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
    const currentBalance = totalInternalBalance + totalPnL;

    return (
        <RiskControlsAndPropSim
            plan={plan}
            accountBalance={currentBalance}
            filteredTrades={trades}
        />
    );
}
