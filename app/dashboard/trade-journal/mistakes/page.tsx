"use client";

import React, { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useTrade } from "@/context/TradeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, TrendingDown } from "lucide-react";
import { CompactUpgradePrompt } from "@/components/UpgradePrompt";
import { PLAN_LIMITS, PlanType } from "@/lib/planAccess";

const parsePL = (v?: string | number | null): number => {
    const str = String(v ?? "0");
    const n = parseFloat(str.replace(/[^0-9\.\-]/g, ""));
    return isNaN(n) ? 0 : n;
};

export default function MistakesPage() {
    const { data: session } = useSession();
    const { accountFilteredTrades: trades = [] } = useTrade() as any;

    const rawPlan = (session?.user as any)?.plan;
    const planType = (String(rawPlan || "").toLowerCase() || "starter") as PlanType;
    const planLimits = PLAN_LIMITS[planType] || PLAN_LIMITS.starter;
    const canUseMistakeAnalyzer = Boolean(planLimits.advancedAnalytics);

    const mistakes = useMemo(() => {
        const lossTrades = trades.filter((t: any) => (t.outcome ?? "").toLowerCase() === "loss");

        // Group by common mistake patterns
        const byNoStopLoss = lossTrades.filter((t: any) => !t.stopLossPrice || t.stopLossPrice === 0);
        const byOvertrading: any[] = [];
        const byRevengeTrading: any[] = [];

        // Check for overtrading (more than 5 trades in a day)
        const tradesByDay: Record<string, any[]> = {};
        trades.forEach((t: any) => {
            const date = t.openTime ? new Date(t.openTime).toDateString() : null;
            if (!date) return;
            if (!tradesByDay[date]) tradesByDay[date] = [];
            tradesByDay[date].push(t);
        });

        Object.entries(tradesByDay).forEach(([date, dayTrades]) => {
            if (dayTrades.length > 5) {
                const losses = dayTrades.filter((t: any) => (t.outcome ?? "").toLowerCase() === "loss");
                byOvertrading.push(...losses);
            }
        });

        // All loss trades for analysis
        const totalLoss = lossTrades.reduce((s: number, t: any) => s + Math.abs(parsePL(t.pnl)), 0);
        const avgLoss = lossTrades.length > 0 ? totalLoss / lossTrades.length : 0;

        return {
            lossTrades,
            byNoStopLoss,
            byOvertrading,
            totalLoss,
            avgLoss,
        };
    }, [trades]);

    if (!canUseMistakeAnalyzer) {
        return (
            <div className="max-w-2xl mx-auto py-12">
                <CompactUpgradePrompt
                    currentPlan={planType}
                    feature="Mistake Analyzer"
                    onUpgrade={() => { }}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Losses</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {mistakes.lossTrades.length}
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Lost</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                            ${mistakes.totalLoss.toFixed(2)}
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Avg Loss</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                            ${mistakes.avgLoss.toFixed(2)}
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">No Stop Loss</p>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                            {mistakes.byNoStopLoss.length}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* No Stop Loss */}
            <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        Trades Without Stop Loss ({mistakes.byNoStopLoss.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    {mistakes.byNoStopLoss.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                            Great! All your trades had stop losses set.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {mistakes.byNoStopLoss.slice(0, 5).map((trade: any, i: number) => (
                                <div
                                    key={i}
                                    className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 flex items-center justify-between"
                                >
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">{trade.symbol}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {trade.strategy || "No strategy"} • No SL set
                                        </p>
                                    </div>
                                    <p className="font-semibold text-red-600 dark:text-red-400">
                                        -${Math.abs(parsePL(trade.pnl)).toFixed(2)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Overtrading */}
            <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                        <TrendingDown className="h-5 w-5 text-red-500" />
                        Potential Overtrading ({mistakes.byOvertrading.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    {mistakes.byOvertrading.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                            No overtrading patterns detected.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {mistakes.byOvertrading.slice(0, 5).map((trade: any, i: number) => (
                                <div
                                    key={i}
                                    className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center justify-between"
                                >
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">{trade.symbol}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            High-volume trading day
                                        </p>
                                    </div>
                                    <p className="font-semibold text-red-600 dark:text-red-400">
                                        -${Math.abs(parsePL(trade.pnl)).toFixed(2)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
