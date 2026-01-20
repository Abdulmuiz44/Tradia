"use client";

import React, { useMemo } from "react";
import { useTrade } from "@/context/TradeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    Line
} from "recharts";
import { getTradePnl } from '@/lib/trade-date-utils';

export default function AnalyticsPerformancePage() {
    const { trades } = useTrade();

    // Pattern analysis data logic
    const patternData = useMemo(() => {
        const symbols = [...new Set(trades.map(t => t.symbol || 'Unknown'))];
        const strategies = [...new Set(trades.map(t => t.strategy || 'Unknown'))];

        return {
            symbols: symbols.map(symbol => {
                const symbolTrades = trades.filter(t => t.symbol === symbol);
                const winningTrades = symbolTrades.filter(t => (t.outcome || '').toLowerCase() === 'win').length;
                return {
                    name: symbol,
                    trades: symbolTrades.length,
                    winRate: symbolTrades.length > 0 ? (winningTrades / symbolTrades.length) * 100 : 0,
                    pnl: symbolTrades.reduce((sum, t) => sum + getTradePnl(t), 0)
                };
            }),
            strategies: strategies.map(strategy => {
                const strategyTrades = trades.filter(t => t.strategy === strategy);
                const winningTrades = strategyTrades.filter(t => (t.outcome || '').toLowerCase() === 'win').length;
                return {
                    name: strategy,
                    trades: strategyTrades.length,
                    winRate: strategyTrades.length > 0 ? (winningTrades / strategyTrades.length) * 100 : 0,
                    pnl: strategyTrades.reduce((sum, t) => sum + getTradePnl(t), 0)
                };
            })
        };
    }, [trades]);

    return (
        <div className="space-y-6">
            {/* Performance by Symbol */}
            <Card>
                <CardHeader>
                    <CardTitle>Performance by Symbol</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={patternData.symbols}>
                                <XAxis dataKey="name" />
                                <YAxis yAxisId="pnl" orientation="left" />
                                <YAxis yAxisId="winRate" orientation="right" />
                                <Tooltip />
                                <Legend />
                                <Bar yAxisId="pnl" dataKey="pnl" fill="#10b981" name="P&L ($)" />
                                <Line yAxisId="winRate" type="monotone" dataKey="winRate" stroke="#f59e0b" strokeWidth={3} name="Win Rate (%)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Strategy Performance */}
            <Card>
                <CardHeader>
                    <CardTitle>Strategy Performance</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={patternData.strategies}>
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="trades" fill="#3b82f6" name="Trades" />
                                <Bar dataKey="winRate" fill="#10b981" name="Win Rate (%)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
