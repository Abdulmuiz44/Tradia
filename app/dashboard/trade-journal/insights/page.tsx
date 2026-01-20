"use client";

import React, { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useTrade } from "@/context/TradeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from "lucide-react";
import { generateInsights, type Insight } from "@/utils/generateInsights";
import { CompactUpgradePrompt } from "@/components/UpgradePrompt";
import { PLAN_LIMITS, PlanType } from "@/lib/planAccess";

const parsePL = (v?: string | number | null): number => {
    const str = String(v ?? "0");
    const n = parseFloat(str.replace(/[^0-9\.\-]/g, ""));
    return isNaN(n) ? 0 : n;
};

export default function InsightsPage() {
    const { data: session } = useSession();
    const { trades = [] } = useTrade() as any;

    const rawPlan = (session?.user as any)?.plan;
    const planType = (String(rawPlan || "").toLowerCase() || "starter") as PlanType;
    const planLimits = PLAN_LIMITS[planType] || PLAN_LIMITS.starter;
    const canUseAdvancedAnalytics = Boolean(planLimits.advancedAnalytics);

    const summary = useMemo(() => {
        const total = trades.length;
        const wins = trades.filter((t: any) => (t.outcome ?? "").toLowerCase() === "win").length;
        const losses = trades.filter((t: any) => (t.outcome ?? "").toLowerCase() === "loss").length;
        const totalPnl = trades.reduce((s: number, t: any) => s + parsePL(t.pnl), 0);
        const winRate = total > 0 ? (wins / total) * 100 : 0;
        const avgWin = wins > 0 ? trades.filter((t: any) => (t.outcome ?? "").toLowerCase() === "win").reduce((s: number, t: any) => s + parsePL(t.pnl), 0) / wins : 0;
        const avgLoss = losses > 0 ? Math.abs(trades.filter((t: any) => (t.outcome ?? "").toLowerCase() === "loss").reduce((s: number, t: any) => s + parsePL(t.pnl), 0) / losses) : 0;
        const expectancy = avgLoss > 0 ? ((winRate / 100) * avgWin) - ((1 - winRate / 100) * avgLoss) : 0;

        return { total, wins, losses, totalPnl, winRate, avgWin, avgLoss, expectancy };
    }, [trades]);

    const insights: Insight[] = useMemo(() => {
        if (!trades.length) return [];
        return generateInsights(trades);
    }, [trades]);

    if (!canUseAdvancedAnalytics) {
        return (
            <div className="max-w-2xl mx-auto py-12">
                <CompactUpgradePrompt
                    currentPlan={planType}
                    feature="AI Insights"
                    onUpgrade={() => { }}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Trades</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.total}</p>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Win Rate</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.winRate.toFixed(1)}%</p>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total P/L</p>
                        <p className={`text-2xl font-bold ${summary.totalPnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                            ${summary.totalPnl.toFixed(2)}
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Expectancy</p>
                        <p className={`text-2xl font-bold ${summary.expectancy >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                            ${summary.expectancy.toFixed(2)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Insights List */}
            <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                        <Zap className="h-5 w-5 text-yellow-500" />
                        AI-Generated Insights
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    {insights.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <Zap className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p className="font-medium">No insights available yet</p>
                            <p className="text-sm mt-1">Add more trades to generate insights</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {insights.map((insight, index) => (
                                <div
                                    key={index}
                                    className={`p-4 rounded-lg border ${insight.severity === "recommendation"
                                        ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                                        : insight.severity === "warning"
                                            ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                                            : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {insight.severity === "recommendation" ? (
                                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                                        ) : insight.severity === "warning" ? (
                                            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                                        ) : (
                                            <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                                        )}
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{insight.title}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{insight.detail}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
