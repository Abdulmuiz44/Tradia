"use client";

import React, { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useTrade } from "@/context/TradeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, TrendingDown } from "lucide-react";
import { CompactUpgradePrompt } from "@/components/UpgradePrompt";
import { PLAN_LIMITS, PlanType } from "@/lib/planAccess";

const parsePL = (v?: string | number | null): number => {
    const str = String(v ?? "0");
    const n = parseFloat(str.replace(/[^0-9\.\-]/g, ""));
    return isNaN(n) ? 0 : n;
};

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

export default function ForecastPage() {
    const { data: session } = useSession();
    const { accountFilteredTrades: trades = [] } = useTrade() as any;

    const rawPlan = (session?.user as any)?.plan;
    const planType = (String(rawPlan || "").toLowerCase() || "starter") as PlanType;
    const planLimits = PLAN_LIMITS[planType] || PLAN_LIMITS.starter;
    const canUseForecast = Boolean(planLimits.aiMLAnalysis && planLimits.realTimeAnalytics);

    const forecast = useMemo(() => {
        const total = trades.length;
        if (total < 5) return null;

        const N = 12;
        const recent = trades.slice(-N);
        const wins = recent.filter((t: any) => (t.outcome ?? "").toLowerCase() === "win").length;
        const recentWinRate = recent.length ? wins / recent.length : 0;

        // Calculate streak
        let streak = 0;
        for (let i = trades.length - 1; i >= 0; i--) {
            const o = (trades[i]?.outcome ?? "").toLowerCase();
            if (o === "win") {
                if (streak >= 0) streak++;
                else break;
            } else if (o === "loss") {
                if (streak <= 0) streak--;
                else break;
            } else break;
        }

        // Calculate expectancy
        const totalWins = trades.filter((t: any) => (t.outcome ?? "").toLowerCase() === "win").length;
        const totalLosses = trades.filter((t: any) => (t.outcome ?? "").toLowerCase() === "loss").length;
        const winRate = total > 0 ? totalWins / total : 0;
        const avgWin = totalWins > 0
            ? trades.filter((t: any) => (t.outcome ?? "").toLowerCase() === "win").reduce((s: number, t: any) => s + parsePL(t.pnl), 0) / totalWins
            : 0;
        const avgLoss = totalLosses > 0
            ? Math.abs(trades.filter((t: any) => (t.outcome ?? "").toLowerCase() === "loss").reduce((s: number, t: any) => s + parsePL(t.pnl), 0) / totalLosses)
            : 0;
        const expectancy = avgLoss > 0 ? (winRate * avgWin) - ((1 - winRate) * avgLoss) : 0;
        const expectancyNorm = expectancy / (Math.abs(avgWin) + Math.abs(avgLoss) + 1);

        const streakFactor = Math.tanh(streak / 5);
        const score = 2.0 * recentWinRate + 1.2 * streakFactor + 1.5 * (expectancyNorm || 0);
        const probability = Math.round(sigmoid(score - 1.5) * 100);

        return {
            probability,
            recentWinRate: recentWinRate * 100,
            streak,
            expectancy,
            totalWins,
            totalLosses,
        };
    }, [trades]);

    if (!canUseForecast) {
        return (
            <div className="max-w-2xl mx-auto py-12">
                <CompactUpgradePrompt
                    currentPlan={planType}
                    feature="Trade Forecasting"
                    onUpgrade={() => { }}
                />
            </div>
        );
    }

    if (!forecast) {
        return (
            <div className="max-w-2xl mx-auto py-12">
                <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                    <CardContent className="p-8 text-center">
                        <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg font-medium text-gray-900 dark:text-white">Not Enough Data</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            You need at least 5 trades to generate forecasts.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Main Forecast */}
            <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800">
                <CardHeader className="border-b border-blue-200 dark:border-blue-800">
                    <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                        <Target className="h-5 w-5 text-blue-500" />
                        Win Probability Forecast
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="text-center">
                        <div className="text-6xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                            {forecast.probability}%
                        </div>
                        <p className="text-lg text-gray-600 dark:text-gray-300">
                            Probability your next trade will be a WIN
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-8">
                        <div className="text-center p-4 rounded-lg bg-white/50 dark:bg-black/20">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Recent WR</p>
                            <p className="text-xl font-semibold text-gray-900 dark:text-white">
                                {forecast.recentWinRate.toFixed(1)}%
                            </p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-white/50 dark:bg-black/20">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Streak</p>
                            <p
                                className={`text-xl font-semibold ${forecast.streak > 0
                                    ? "text-green-600 dark:text-green-400"
                                    : forecast.streak < 0
                                        ? "text-red-600 dark:text-red-400"
                                        : "text-gray-900 dark:text-white"
                                    }`}
                            >
                                {forecast.streak > 0 ? `+${forecast.streak}` : forecast.streak}
                            </p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-white/50 dark:bg-black/20">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Expectancy</p>
                            <p
                                className={`text-xl font-semibold ${forecast.expectancy >= 0
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-red-600 dark:text-red-400"
                                    }`}
                            >
                                ${forecast.expectancy.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-6">
                        This is a heuristic forecast based on your recent performance. Use for guidance only.
                    </p>
                </CardContent>
            </Card>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4">
                <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                            <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{forecast.totalWins}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total Wins</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                            <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{forecast.totalLosses}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total Losses</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
