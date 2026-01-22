"use client";

import React, { useMemo } from "react";
import { useTrade } from "@/context/TradeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    BarChart,
    Bar,
    XAxis,
    YAxis
} from "recharts";
import { format } from "date-fns";
import { getTradeDate } from '@/lib/trade-date-utils';

export default function AnalyticsPatternsPage() {
    const { accountFilteredTrades: trades } = useTrade();

    const performanceData = useMemo(() => {
        const dailyData: { [key: string]: { date: string, trades: number } } = {};
        trades.forEach(trade => {
            const tradeDate = getTradeDate(trade) ?? new Date();
            const date = format(tradeDate, 'yyyy-MM-dd');
            if (!dailyData[date]) {
                dailyData[date] = { date, trades: 0 };
            }
            dailyData[date].trades += 1;
        });
        return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
    }, [trades]);

    return (
        <div className="space-y-6">
            {/* Trade Distribution */}
            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Trade Outcomes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Wins', value: trades.filter(t => (t.outcome || '').toLowerCase() === 'win').length },
                                            { name: 'Losses', value: trades.filter(t => (t.outcome || '').toLowerCase() === 'loss').length },
                                            { name: 'Breakeven', value: trades.filter(t => (t.outcome || '').toLowerCase() === 'breakeven').length },
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                    >
                                        <Cell fill="#10b981" />
                                        <Cell fill="#ef4444" />
                                        <Cell fill="#f59e0b" />
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Daily Trade Frequency</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={performanceData}>
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="trades" fill="#3b82f6" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
