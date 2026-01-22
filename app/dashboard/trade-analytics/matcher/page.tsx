"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useTrade } from "@/context/TradeContext";
import OptimalStrategyMatcher from "@/components/analytics/OptimalStrategyMatcher";
import { CompactUpgradePrompt } from "@/components/UpgradePrompt";

export default function AnalyticsMatcherPage() {
    const { data: session } = useSession();
    const { accountFilteredTrades: trades } = useTrade();

    const rawPlan = String((session?.user as any)?.plan || 'starter').toLowerCase();
    const plan = (rawPlan === 'free' ? 'starter' : rawPlan) as 'starter' | 'pro' | 'plus' | 'elite';

    const hasPlan = (required: string) => {
        const levels = ['starter', 'pro', 'plus', 'elite'];
        return levels.indexOf(plan) >= levels.indexOf(required);
    };

    if (!hasPlan('pro')) {
        return (
            <CompactUpgradePrompt
                currentPlan={plan}
                feature="Optimal Strategy Matcher"
                onUpgrade={() => { try { (window as any).location.hash = '#upgrade'; } catch { } }}
                className="max-w-xl mx-auto"
            />
        );
    }

    return (
        <OptimalStrategyMatcher
            trades={trades}
            plan={plan}
        />
    );
}
