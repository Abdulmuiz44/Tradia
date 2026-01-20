"use client";

import React, { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useTrade } from "@/context/TradeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart2 } from "lucide-react";
import { CompactUpgradePrompt } from "@/components/UpgradePrompt";
import { PLAN_LIMITS, PlanType } from "@/lib/planAccess";

const parsePL = (v?: string | number | null): number => {
    const str = String(v ?? "0");
    const n = parseFloat(str.replace(/[^0-9\.\-]/g, ""));
    return isNaN(n) ? 0 : n;
};

export default function PatternsPage() {
    const { data: session } = useSession();
    const { trades = [] } = useTrade() as any;

    const rawPlan = (session?.user as any)?.plan;
    const planType = (String(rawPlan || "").toLowerCase() || "starter") as PlanType;
    const planLimits = PLAN_LIMITS[planType] || PLAN_LIMITS.starter;
    const canUsePatterns = Boolean(planLimits.realTimeAnalytics);

    const patterns = useMemo(() => {
        // Group by symbol
        const bySymbol: Record<string, { wins: number; losses: number; pnl: number; count: number }> = {};
        trades.forEach((t: any) => {
            const sym = (t.symbol ?? "Unknown").toUpperCase();
            if (!bySymbol[sym]) bySymbol[sym] = { wins: 0, losses: 0, pnl: 0, count: 0 };
            bySymbol[sym].count++;
            bySymbol[sym].pnl += parsePL(t.pnl);
            if ((t.outcome ?? "").toLowerCase() === "win") bySymbol[sym].wins++;
            if ((t.outcome ?? "").toLowerCase() === "loss") bySymbol[sym].losses++;
        });

        // Group by strategy
        const byStrategy: Record<string, { wins: number; losses: number; pnl: number; count: number }> = {};
        trades.forEach((t: any) => {
            const strat = (t.strategy ?? "No Strategy").trim() || "No Strategy";
            if (!byStrategy[strat]) byStrategy[strat] = { wins: 0, losses: 0, pnl: 0, count: 0 };
            byStrategy[strat].count++;
            byStrategy[strat].pnl += parsePL(t.pnl);
            if ((t.outcome ?? "").toLowerCase() === "win") byStrategy[strat].wins++;
            if ((t.outcome ?? "").toLowerCase() === "loss") byStrategy[strat].losses++;
        });

        // Group by hour
        const byHour: Record<number, { wins: number; losses: number; pnl: number; count: number }> = {};
        trades.forEach((t: any) => {
            const time = t.openTime ? new Date(t.openTime) : null;
            if (!time || isNaN(time.getTime())) return;
            const hour = time.getHours();
            if (!byHour[hour]) byHour[hour] = { wins: 0, losses: 0, pnl: 0, count: 0 };
            byHour[hour].count++;
            byHour[hour].pnl += parsePL(t.pnl);
            if ((t.outcome ?? "").toLowerCase() === "win") byHour[hour].wins++;
            if ((t.outcome ?? "").toLowerCase() === "loss") byHour[hour].losses++;
        });

        return { bySymbol, byStrategy, byHour };
    }, [trades]);

    if (!canUsePatterns) {
        return (
            <div className="max-w-2xl mx-auto py-12">
                <CompactUpgradePrompt
                    currentPlan={planType}
                    feature="Pattern Analysis"
                    onUpgrade={() => { }}
                />
            </div>
        );
    }

    const symbolData = Object.entries(patterns.bySymbol)
        .map(([symbol, data]) => ({ symbol, ...data, winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0 }))
        .sort((a, b) => b.count - a.count);

    const strategyData = Object.entries(patterns.byStrategy)
        .map(([strategy, data]) => ({ strategy, ...data, winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0 }))
        .sort((a, b) => b.pnl - a.pnl);

    return (
        <div className="space-y-6">
            {/* By Symbol */}
            <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                        <BarChart2 className="h-5 w-5 text-blue-500" />
                        Performance by Symbol
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {symbolData.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            No data available
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {symbolData.slice(0, 10).map((item) => (
                                <div key={item.symbol} className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">{item.symbol}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {item.count} trades • {item.wins}W / {item.losses}L
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-semibold ${item.pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                            ${item.pnl.toFixed(2)}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {item.winRate.toFixed(1)}% WR
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* By Strategy */}
            <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                        <BarChart2 className="h-5 w-5 text-purple-500" />
                        Performance by Strategy
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {strategyData.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            No data available
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {strategyData.slice(0, 10).map((item) => (
                                <div key={item.strategy} className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">{item.strategy}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {item.count} trades • {item.wins}W / {item.losses}L
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-semibold ${item.pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                            ${item.pnl.toFixed(2)}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {item.winRate.toFixed(1)}% WR
                                        </p>
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
