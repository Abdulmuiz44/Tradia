"use client";

import React, { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useTrade } from "@/context/TradeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sliders, TrendingUp, AlertCircle } from "lucide-react";
import { CompactUpgradePrompt } from "@/components/UpgradePrompt";
import { PLAN_LIMITS, PlanType } from "@/lib/planAccess";

const parsePL = (v?: string | number | null): number => {
    const str = String(v ?? "0");
    const n = parseFloat(str.replace(/[^0-9\.\-]/g, ""));
    return isNaN(n) ? 0 : n;
};

export default function OptimizerPage() {
    const { data: session } = useSession();
    const { accountFilteredTrades: trades = [] } = useTrade() as any;

    const rawPlan = (session?.user as any)?.plan;
    const planType = (String(rawPlan || "").toLowerCase() || "starter") as PlanType;
    const planLimits = PLAN_LIMITS[planType] || PLAN_LIMITS.starter;
    const canUseOptimizer = Boolean(planLimits.riskManagement);

    const [accountBalance, setAccountBalance] = useState<number | "">(10000);
    const [riskPercent, setRiskPercent] = useState<number>(1);

    const projectedRisk = useMemo(() => {
        const balance = typeof accountBalance === "number" ? accountBalance : Number(accountBalance) || 0;
        return balance * (riskPercent / 100);
    }, [accountBalance, riskPercent]);

    const optimization = useMemo(() => {
        const total = trades.length;
        if (total < 10) return null;

        // Find best performing days
        const byDay: Record<number, { pnl: number; count: number }> = {};
        trades.forEach((t: any) => {
            const date = t.openTime ? new Date(t.openTime) : null;
            if (!date || isNaN(date.getTime())) return;
            const day = date.getDay();
            if (!byDay[day]) byDay[day] = { pnl: 0, count: 0 };
            byDay[day].pnl += parsePL(t.pnl);
            byDay[day].count++;
        });

        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const dayPerformance = Object.entries(byDay)
            .map(([day, data]) => ({ day: days[parseInt(day)], ...data, avg: data.pnl / data.count }))
            .sort((a, b) => b.avg - a.avg);

        // Find best performing hours
        const byHour: Record<number, { pnl: number; count: number }> = {};
        trades.forEach((t: any) => {
            const date = t.openTime ? new Date(t.openTime) : null;
            if (!date || isNaN(date.getTime())) return;
            const hour = date.getHours();
            if (!byHour[hour]) byHour[hour] = { pnl: 0, count: 0 };
            byHour[hour].pnl += parsePL(t.pnl);
            byHour[hour].count++;
        });

        const hourPerformance = Object.entries(byHour)
            .map(([hour, data]) => ({ hour: parseInt(hour), ...data, avg: data.pnl / data.count }))
            .sort((a, b) => b.avg - a.avg);

        return { dayPerformance, hourPerformance };
    }, [trades]);

    if (!canUseOptimizer) {
        return (
            <div className="max-w-2xl mx-auto py-12">
                <CompactUpgradePrompt
                    currentPlan={planType}
                    feature="Trade Optimizer"
                    onUpgrade={() => { }}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Position Size Calculator */}
            <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                        <Sliders className="h-5 w-5 text-orange-500" />
                        Position Size Calculator
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Account Balance
                            </label>
                            <input
                                type="number"
                                value={accountBalance === "" ? "" : accountBalance}
                                onChange={(e) => setAccountBalance(e.target.value === "" ? "" : Number(e.target.value))}
                                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0D1117] text-gray-900 dark:text-white"
                                placeholder="10000"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Risk Per Trade (%)
                            </label>
                            <input
                                type="number"
                                value={riskPercent}
                                onChange={(e) => setRiskPercent(Number(e.target.value))}
                                min={0.1}
                                max={10}
                                step={0.1}
                                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0D1117] text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>
                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Maximum Risk Amount</p>
                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                            ${projectedRisk.toFixed(2)}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Optimization Insights */}
            {optimization ? (
                <>
                    {/* Best Days */}
                    <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                        <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                            <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-green-500" />
                                Best Trading Days
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                {optimization.dayPerformance.slice(0, 5).map((item) => (
                                    <div key={item.day} className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{item.day}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{item.count} trades</p>
                                        </div>
                                        <p
                                            className={`font-semibold ${item.avg >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                                }`}
                                        >
                                            ${item.avg.toFixed(2)} avg
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Best Hours */}
                    <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                        <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                            <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-purple-500" />
                                Best Trading Hours
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                {optimization.hourPerformance.slice(0, 5).map((item) => (
                                    <div key={item.hour} className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {item.hour.toString().padStart(2, "0")}:00 - {(item.hour + 1).toString().padStart(2, "0")}:00
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{item.count} trades</p>
                                        </div>
                                        <p
                                            className={`font-semibold ${item.avg >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                                }`}
                                        >
                                            ${item.avg.toFixed(2)} avg
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </>
            ) : (
                <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                    <CardContent className="p-8 text-center">
                        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg font-medium text-gray-900 dark:text-white">Not Enough Data</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            You need at least 10 trades to generate optimization insights.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
