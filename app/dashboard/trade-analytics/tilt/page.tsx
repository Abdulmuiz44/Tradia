"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useTrade } from "@/context/TradeContext";
import TiltModeDetector from "@/components/analytics/TiltModeDetector";
import { CompactUpgradePrompt } from "@/components/UpgradePrompt";

export default function AnalyticsTiltPage() {
    const { data: session } = useSession();
    const { trades } = useTrade();

    const rawPlan = String((session?.user as any)?.plan || 'starter').toLowerCase();
    const plan = (rawPlan === 'free' ? 'starter' : rawPlan) as 'starter' | 'pro' | 'plus' | 'elite';

    const hasPlan = (required: string) => {
        const levels = ['starter', 'pro', 'plus', 'elite'];
        return levels.indexOf(plan) >= levels.indexOf(required);
    };

    if (!hasPlan('plus')) {
        return (
            <CompactUpgradePrompt
                currentPlan={plan}
                feature="Tilt Mode Detector"
                onUpgrade={() => { try { (window as any).location.hash = '#upgrade'; } catch { } }}
                className="max-w-xl mx-auto"
            />
        );
    }

    return (
        <TiltModeDetector
            trades={trades}
            plan={plan}
        />
    );
}
