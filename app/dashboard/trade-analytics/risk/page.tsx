"use client";

import React, { useMemo } from "react";
import { useTrade } from "@/context/TradeContext";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Target, TrendingDown, Activity } from "lucide-react";
import {
    ResponsiveContainer,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    Legend
} from "recharts";

export default function AnalyticsRiskPage() {
    const { trades } = useTrade();
    const { data: session } = useSession();

    const rawPlan = String((session?.user as any)?.plan || 'starter').toLowerCase();
    const plan = (rawPlan === 'free' ? 'starter' : rawPlan) as 'starter' | 'pro' | 'plus' | 'elite';

    const riskMetrics = useMemo(() => {
        if (plan === 'starter') {
            return {
                sharpeRatio: 0,
                maxDrawdown: 0,
                volatility: 0,
                calmarRatio: 0,
                sortinoRatio: 0,
                informationRatio: 0
            };
        }

        const returns = trades.map(t => parseFloat(String(t.pnl || 0)));
        const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length || 0;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length || 0;
        const volatility = Math.sqrt(variance);

        // Calculate drawdown
        let peak = 0;
        let maxDrawdown = 0;
        let currentEquity = 0;

        trades.forEach(trade => {
            currentEquity += parseFloat(String(trade.pnl || 0));
            if (currentEquity > peak) peak = currentEquity;
            const drawdown = peak > 0 ? (peak - currentEquity) / peak : 0;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        });

        return {
            sharpeRatio: volatility > 0 ? avgReturn / volatility : 0,
            maxDrawdown: maxDrawdown * 100,
            volatility: volatility,
            calmarRatio: maxDrawdown > 0 ? avgReturn / maxDrawdown : 0,
            sortinoRatio: volatility > 0 ? avgReturn / volatility : 0,
            informationRatio: volatility > 0 ? avgReturn / volatility : 0
        };
    }, [trades, plan]);

    if (plan === 'starter') {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <Crown className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
                    <h3 className="text-xl font-semibold mb-2">Advanced Risk Analytics</h3>
                    <p className="text-muted-foreground mb-4">
                        Unlock detailed risk metrics, Sharpe ratio, drawdown analysis, and more with a PRO subscription.
                    </p>
                    <Button
                        className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                        onClick={() => {
                            try { (window as any).location.href = '/checkout?plan=pro&billing=monthly'; } catch { }
                        }}
                    >
                        Upgrade to PRO
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Risk Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Target className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium">Sharpe Ratio</span>
                        </div>
                        <p className="text-2xl font-bold">{riskMetrics.sharpeRatio.toFixed(2)}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingDown className="w-4 h-4 text-red-500" />
                            <span className="text-sm font-medium">Max Drawdown</span>
                        </div>
                        <p className="text-2xl font-bold">{riskMetrics.maxDrawdown.toFixed(2)}%</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Activity className="w-4 h-4 text-purple-500" />
                            <span className="text-sm font-medium">Volatility</span>
                        </div>
                        <p className="text-2xl font-bold">{riskMetrics.volatility.toFixed(2)}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Risk Radar Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Risk Profile</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={[
                                { subject: 'Sharpe', A: Math.min(riskMetrics.sharpeRatio * 10, 100), fullMark: 100 },
                                { subject: 'Drawdown', A: Math.max(0, 100 - riskMetrics.maxDrawdown), fullMark: 100 },
                                { subject: 'Volatility', A: Math.max(0, 100 - riskMetrics.volatility * 10), fullMark: 100 },
                                { subject: 'Calmar', A: Math.min(riskMetrics.calmarRatio * 50, 100), fullMark: 100 },
                                { subject: 'Sortino', A: Math.min(riskMetrics.sortinoRatio * 10, 100), fullMark: 100 },
                                { subject: 'Info Ratio', A: Math.min(riskMetrics.informationRatio * 10, 100), fullMark: 100 },
                            ]}>
                                <PolarGrid />
                                <PolarAngleAxis dataKey="subject" />
                                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                                <Radar
                                    name="Risk Score"
                                    dataKey="A"
                                    stroke="#3b82f6"
                                    fill="#3b82f6"
                                    fillOpacity={0.3}
                                />
                                <Legend />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
