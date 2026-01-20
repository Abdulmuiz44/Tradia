"use client";

import React, { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useTrade } from "@/context/TradeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Flag, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { CompactUpgradePrompt } from "@/components/UpgradePrompt";
import { PLAN_LIMITS, PlanType } from "@/lib/planAccess";

const parsePL = (v?: string | number | null): number => {
    const str = String(v ?? "0");
    const n = parseFloat(str.replace(/[^0-9\.\-]/g, ""));
    return isNaN(n) ? 0 : n;
};

export default function PropPage() {
    const { data: session } = useSession();
    const { trades = [] } = useTrade() as any;

    const rawPlan = (session?.user as any)?.plan;
    const planType = (String(rawPlan || "").toLowerCase() || "starter") as PlanType;
    const planLimits = PLAN_LIMITS[planType] || PLAN_LIMITS.starter;
    const canUsePropDesk = Boolean(planLimits.customIntegrations);

    const [propInitial, setPropInitial] = useState<number | "">(100000);
    const [propTargetPercent, setPropTargetPercent] = useState<number>(10);
    const [propMaxDrawdownPercent, setPropMaxDrawdownPercent] = useState<number>(5);
    const [propMinWinRate, setPropMinWinRate] = useState<number>(50);

    const propStatus = useMemo(() => {
        const initial = typeof propInitial === "number" && propInitial > 0 ? propInitial : 100000;
        const pnl = trades.reduce((s: number, t: any) => s + parsePL(t.pnl), 0);
        const current = initial + pnl;
        const pctGain = ((current - initial) / initial) * 100;

        // Calculate max drawdown
        let peak = initial;
        let maxDD = 0;
        let equity = initial;
        const sortedTrades = [...trades].sort((a: any, b: any) => {
            const aTime = a.openTime ? new Date(a.openTime).getTime() : 0;
            const bTime = b.openTime ? new Date(b.openTime).getTime() : 0;
            return aTime - bTime;
        });

        for (const t of sortedTrades) {
            equity += parsePL(t.pnl);
            if (equity > peak) peak = equity;
            const dd = ((peak - equity) / peak) * 100;
            if (dd > maxDD) maxDD = dd;
        }

        const winCount = trades.filter((t: any) => (t.outcome ?? "").toLowerCase() === "win").length;
        const total = trades.length;
        const winRate = total ? (winCount / total) * 100 : 0;

        const passedTarget = pctGain >= propTargetPercent;
        const passedDD = maxDD <= propMaxDrawdownPercent;
        const passedWinRate = winRate >= propMinWinRate;

        return {
            initial,
            pnl,
            current,
            pctGain,
            maxDD,
            winRate,
            passedTarget,
            passedDD,
            passedWinRate,
        };
    }, [trades, propInitial, propTargetPercent, propMaxDrawdownPercent, propMinWinRate]);

    if (!canUsePropDesk) {
        return (
            <div className="max-w-2xl mx-auto py-12">
                <CompactUpgradePrompt
                    currentPlan={planType}
                    feature="Prop Firm Tracker"
                    onUpgrade={() => { }}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Settings */}
            <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                        <Users className="h-5 w-5 text-teal-500" />
                        Prop Firm Challenge Settings
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Initial Capital
                            </label>
                            <input
                                type="number"
                                value={propInitial === "" ? "" : propInitial}
                                onChange={(e) => setPropInitial(e.target.value === "" ? "" : Number(e.target.value))}
                                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0D1117] text-gray-900 dark:text-white"
                                placeholder="100000"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Target %
                            </label>
                            <input
                                type="number"
                                value={propTargetPercent}
                                onChange={(e) => setPropTargetPercent(Number(e.target.value))}
                                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0D1117] text-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Max DD %
                            </label>
                            <input
                                type="number"
                                value={propMaxDrawdownPercent}
                                onChange={(e) => setPropMaxDrawdownPercent(Number(e.target.value))}
                                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0D1117] text-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Min WR %
                            </label>
                            <input
                                type="number"
                                value={propMinWinRate}
                                onChange={(e) => setPropMinWinRate(Number(e.target.value))}
                                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0D1117] text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Progress */}
            <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                        <Flag className="h-5 w-5 text-yellow-500" />
                        Challenge Progress
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-6">
                    {/* Overall Progress */}
                    <div className="text-center p-6 rounded-lg bg-gray-50 dark:bg-[#0D1117]">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Current Gain</p>
                        <p className={`text-4xl font-bold mt-2 ${propStatus.pctGain >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                            {propStatus.pctGain.toFixed(2)}%
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            ${propStatus.pnl.toFixed(2)} / Target: {propTargetPercent}%
                        </p>
                    </div>

                    {/* Checks */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className={`p-4 rounded-lg border ${propStatus.passedTarget ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"}`}>
                            <div className="flex items-center gap-2">
                                {propStatus.passedTarget ? (
                                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                ) : (
                                    <AlertCircle className="h-5 w-5 text-gray-400" />
                                )}
                                <span className="font-medium text-gray-900 dark:text-white">Profit Target</span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {propStatus.pctGain.toFixed(1)}% / {propTargetPercent}%
                            </p>
                        </div>

                        <div className={`p-4 rounded-lg border ${propStatus.passedDD ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"}`}>
                            <div className="flex items-center gap-2">
                                {propStatus.passedDD ? (
                                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                ) : (
                                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                )}
                                <span className="font-medium text-gray-900 dark:text-white">Drawdown</span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {propStatus.maxDD.toFixed(1)}% / {propMaxDrawdownPercent}%
                            </p>
                        </div>

                        <div className={`p-4 rounded-lg border ${propStatus.passedWinRate ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"}`}>
                            <div className="flex items-center gap-2">
                                {propStatus.passedWinRate ? (
                                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                ) : (
                                    <AlertCircle className="h-5 w-5 text-gray-400" />
                                )}
                                <span className="font-medium text-gray-900 dark:text-white">Win Rate</span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {propStatus.winRate.toFixed(1)}% / {propMinWinRate}%
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
