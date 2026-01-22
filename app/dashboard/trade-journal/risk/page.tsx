"use client";

import React, { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useTrade } from "@/context/TradeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { CompactUpgradePrompt } from "@/components/UpgradePrompt";
import { PLAN_LIMITS, PlanType } from "@/lib/planAccess";

const parsePL = (v?: string | number | null): number => {
    const str = String(v ?? "0");
    const n = parseFloat(str.replace(/[^0-9\.\-]/g, ""));
    return isNaN(n) ? 0 : n;
};

export default function RiskPage() {
    const { data: session } = useSession();
    const { accountFilteredTrades: trades = [] } = useTrade() as any;

    const rawPlan = (session?.user as any)?.plan;
    const planType = (String(rawPlan || "").toLowerCase() || "starter") as PlanType;
    const planLimits = PLAN_LIMITS[planType] || PLAN_LIMITS.starter;
    const canUseRiskTab = Boolean(planLimits.riskManagement);

    const [accountBalance, setAccountBalance] = useState<number>(10000);
    const [maxRiskPercent, setMaxRiskPercent] = useState<number>(2);

    const riskMetrics = useMemo(() => {
        const total = trades.length;
        if (total === 0) return null;

        const sortedTrades = [...trades].sort((a: any, b: any) => {
            const aTime = a.openTime ? new Date(a.openTime).getTime() : 0;
            const bTime = b.openTime ? new Date(b.openTime).getTime() : 0;
            return aTime - bTime;
        });

        // Calculate drawdown
        let peak = accountBalance;
        let maxDrawdown = 0;
        let currentDrawdown = 0;
        let equity = accountBalance;
        const equityCurve: number[] = [accountBalance];

        for (const t of sortedTrades) {
            equity += parsePL(t.pnl);
            equityCurve.push(equity);
            if (equity > peak) peak = equity;
            const dd = ((peak - equity) / peak) * 100;
            if (dd > maxDrawdown) maxDrawdown = dd;
            currentDrawdown = dd;
        }

        // Calculate consecutive losses
        let maxConsecutiveLosses = 0;
        let currentLosses = 0;
        for (const t of sortedTrades) {
            if ((t.outcome ?? "").toLowerCase() === "loss") {
                currentLosses++;
                if (currentLosses > maxConsecutiveLosses) maxConsecutiveLosses = currentLosses;
            } else {
                currentLosses = 0;
            }
        }

        // Calculate risk per trade stats
        const riskAmounts = trades
            .filter((t: any) => t.stopLossPrice && t.entryPrice)
            .map((t: any) => {
                const risk = Math.abs(t.entryPrice - t.stopLossPrice) * (t.lotSize || 1);
                return risk;
            });
        const avgRisk = riskAmounts.length > 0
            ? riskAmounts.reduce((s: number, r: number) => s + r, 0) / riskAmounts.length
            : 0;

        // Sharpe ratio approximation (simplified)
        const pnls = trades.map((t: any) => parsePL(t.pnl));
        const avgPnl = pnls.reduce((s: number, p: number) => s + p, 0) / pnls.length;
        const variance = pnls.reduce((s: number, p: number) => s + Math.pow(p - avgPnl, 2), 0) / pnls.length;
        const stdDev = Math.sqrt(variance);
        const sharpeRatio = stdDev > 0 ? avgPnl / stdDev : 0;

        return {
            equity,
            maxDrawdown,
            currentDrawdown,
            maxConsecutiveLosses,
            avgRisk,
            sharpeRatio,
            totalPnl: equity - accountBalance,
        };
    }, [trades, accountBalance]);

    if (!canUseRiskTab) {
        return (
            <div className="max-w-2xl mx-auto py-12">
                <CompactUpgradePrompt
                    currentPlan={planType}
                    feature="Risk Management"
                    onUpgrade={() => { }}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Account Settings */}
            <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                        <Shield className="h-5 w-5 text-red-500" />
                        Risk Parameters
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Account Balance
                            </label>
                            <input
                                type="number"
                                value={accountBalance}
                                onChange={(e) => setAccountBalance(Number(e.target.value))}
                                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0D1117] text-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Max Risk Per Trade (%)
                            </label>
                            <input
                                type="number"
                                value={maxRiskPercent}
                                onChange={(e) => setMaxRiskPercent(Number(e.target.value))}
                                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0D1117] text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Risk Metrics */}
            {riskMetrics ? (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                            <CardContent className="p-4">
                                <p className="text-sm text-gray-500 dark:text-gray-400">Current Equity</p>
                                <p className={`text-2xl font-bold ${riskMetrics.equity >= accountBalance ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                    ${riskMetrics.equity.toFixed(2)}
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                            <CardContent className="p-4">
                                <p className="text-sm text-gray-500 dark:text-gray-400">Max Drawdown</p>
                                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                                    {riskMetrics.maxDrawdown.toFixed(2)}%
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                            <CardContent className="p-4">
                                <p className="text-sm text-gray-500 dark:text-gray-400">Max Consecutive Losses</p>
                                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                    {riskMetrics.maxConsecutiveLosses}
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                            <CardContent className="p-4">
                                <p className="text-sm text-gray-500 dark:text-gray-400">Sharpe Ratio</p>
                                <p className={`text-2xl font-bold ${riskMetrics.sharpeRatio >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                    {riskMetrics.sharpeRatio.toFixed(2)}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Warnings */}
                    {riskMetrics.maxDrawdown > 10 && (
                        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                            <CardContent className="p-4 flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                                <div>
                                    <p className="font-medium text-red-800 dark:text-red-200">High Drawdown Warning</p>
                                    <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                                        Your maximum drawdown of {riskMetrics.maxDrawdown.toFixed(2)}% exceeds the recommended 10% threshold.
                                        Consider reducing position sizes or reviewing your risk management strategy.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            ) : (
                <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                    <CardContent className="p-8 text-center">
                        <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg font-medium text-gray-900 dark:text-white">No Trade Data</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            Add trades to see risk metrics.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
