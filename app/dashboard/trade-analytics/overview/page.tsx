"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTrade } from "@/context/TradeContext";
import { useAccount } from "@/context/AccountContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    AreaChart,
    Area,
} from "recharts";
import {
    TrendingUp,
    TrendingDown,
    BarChart3,
    PieChart as PieChartIcon,
    Activity,
    Target,
    Zap,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    Award,
    Crown,
    Calendar
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, isSameDay } from "date-fns";
import { getTradeDate, getTradePnl } from '@/lib/trade-date-utils';
import WeeklyCoachRecap from "@/components/analytics/WeeklyCoachRecap";
import ProInsights from "@/components/analytics/ProInsights";
import { CompactUpgradePrompt } from "@/components/UpgradePrompt";

export default function AnalyticsOverviewPage() {
    const { data: session } = useSession();
    const { trades } = useTrade();
    const { accounts } = useAccount();
    const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d');

    // Plan/role from session
    const rawPlan = String((session?.user as any)?.plan || 'starter').toLowerCase();
    const plan = (rawPlan === 'free' ? 'starter' : rawPlan) as 'starter' | 'pro' | 'plus' | 'elite';

    // Filter trades based on timeframe
    const filteredTrades = useMemo(() => {
        let days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : timeframe === '1y' ? 365 : Infinity;
        if (!Number.isFinite(days)) return trades;
        const cutoffDate = subDays(new Date(), days as number);

        return trades.filter(trade => {
            const tradeDate = getTradeDate(trade);
            return tradeDate ? tradeDate >= cutoffDate : false;
        });
    }, [trades, timeframe]);

    // Calculate Metrics
    const metrics = useMemo(() => {
        // 1. Account Balance (Base + All Time PnL of all trades, OR Base + PnL of selected period?)
        // User asked: "account balance should show total calculations of the trade account added by the user with the pnl he made based on the selected period"
        // Interpretation: Show Start Balance (Sum of Initial) + PnL (Filtered). 
        // BUT realistically, "Account Balance" implies Current Total. 
        // I will show: Sum(Initial Accounts) + Sum(All Time PnL) as "Current Total Balance".
        // And "PnL" metric will show the filtered period PnL.

        // Actually, let's stick to user request: "with the pnl he made based on the selected period".
        // So maybe they want to see "How much would I have based on this period's performance?".
        // I will compute: Total Initial Balance + Filtered PnL.

        const totalInitialBalance = accounts.reduce((sum, acc) => sum + (Number(acc.account_size) || 0), 0);
        const totalPnL = filteredTrades.reduce((sum, t) => sum + getTradePnl(t), 0);
        const currentBalance = totalInitialBalance + totalPnL;

        const totalTrades = filteredTrades.length;
        const winningTrades = filteredTrades.filter(t => (t.outcome || '').toLowerCase() === 'win').length;
        const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
        const avgTrade = totalTrades > 0 ? totalPnL / totalTrades : 0;

        const grossProfit = filteredTrades
            .filter(t => (t.outcome || '').toLowerCase() === 'win')
            .reduce((sum, t) => sum + getTradePnl(t), 0);

        const grossLoss = filteredTrades
            .filter(t => (t.outcome || '').toLowerCase() === 'loss')
            .reduce((sum, t) => sum + Math.abs(getTradePnl(t)), 0);

        const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

        // Best Streak Calculation
        let currentStreak = 0;
        let maxStreak = 0;
        // Sort trades by date ascending
        const sortedTrades = [...filteredTrades].sort((a, b) => {
            const dateA = getTradeDate(a)?.getTime() || 0;
            const dateB = getTradeDate(b)?.getTime() || 0;
            return dateA - dateB;
        });

        for (const trade of sortedTrades) {
            if ((trade.outcome || '').toLowerCase() === 'win') {
                currentStreak++;
                if (currentStreak > maxStreak) maxStreak = currentStreak;
            } else {
                currentStreak = 0;
            }
        }

        return {
            balance: currentBalance,
            totalTrades,
            winRate,
            totalPnL,
            avgTrade,
            profitFactor,
            bestStreak: maxStreak,
            worstTrade: Math.min(...filteredTrades.map(t => getTradePnl(t)), 0),
            grossProfit,
            grossLoss
        };
    }, [filteredTrades, accounts]);

    // Chart Data Preparation
    const performanceData = useMemo(() => {
        const dailyData: { [key: string]: any } = {};

        // Initial accumulation to track cumulative
        // We sort all filtered trades first
        const sorted = [...filteredTrades].sort((a, b) => (getTradeDate(a)?.getTime() || 0) - (getTradeDate(b)?.getTime() || 0));

        // We need starting equity relative to the period? 
        // Or just cumulative PnL? 
        // Let's plot Cumulative PnL for the period.

        let cumulativePnL = 0;
        let peakPnL = 0;

        sorted.forEach(trade => {
            const tradeDate = getTradeDate(trade) ?? new Date();
            const dateStr = format(tradeDate, 'yyyy-MM-dd');

            if (!dailyData[dateStr]) {
                dailyData[dateStr] = {
                    date: dateStr,
                    pnl: 0,
                    cumulative: 0,
                    drawdown: 0
                };
            }

            const pnl = getTradePnl(trade);
            dailyData[dateStr].pnl += pnl;
        });

        // Transform to array and calculate cumulative
        const dates = Object.keys(dailyData).sort();
        const result = [];

        for (const date of dates) {
            cumulativePnL += dailyData[date].pnl;

            if (cumulativePnL > peakPnL) peakPnL = cumulativePnL;
            const drawdown = peakPnL > cumulativePnL ? ((peakPnL - cumulativePnL) / (peakPnL || 1)) * 100 : 0; // Relative to peak gain? Or Account?
            // Drawdown relative to account balance + max gain is more accurate, but for PnL curve:
            // DD = (Peak - Current) / Peak. But if Peak is 0 (start), it's weird.
            // Let's use simple Peak - Current (Dollar Drawdown) or % if we assume an Initial Balance.
            // I will stick to Dollar Drawdown or simply PnL curve.

            result.push({
                date: date,
                pnl: cumulativePnL,
                dailyPnL: dailyData[date].pnl
            });
        }
        return result;
    }, [filteredTrades]);

    const monthlyPnLData = useMemo(() => {
        const monthlyData: { [key: string]: number } = {};
        filteredTrades.forEach(trade => {
            const tradeDate = getTradeDate(trade);
            if (tradeDate) {
                const monthKey = format(tradeDate, 'MMM yyyy');
                monthlyData[monthKey] = (monthlyData[monthKey] || 0) + getTradePnl(trade);
            }
        });
        return Object.entries(monthlyData).map(([month, pnl]) => ({
            month,
            pnl: Math.round(pnl * 100) / 100
        }));
    }, [filteredTrades]);

    const symbolPerformanceData = useMemo(() => {
        const symbolData: { [key: string]: number } = {};
        filteredTrades.forEach(trade => {
            const symbol = trade.symbol || 'Unknown';
            symbolData[symbol] = (symbolData[symbol] || 0) + getTradePnl(trade);
        });
        return Object.entries(symbolData)
            .map(([symbol, pnl]) => ({ symbol, pnl: Math.round(pnl * 100) / 100 }))
            .sort((a, b) => b.pnl - a.pnl)
            .slice(0, 10);
    }, [filteredTrades]);

    const weeklyActivityData = useMemo(() => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayCounts = days.map(day => ({ day, trades: 0 }));

        filteredTrades.forEach(trade => {
            const tradeDate = getTradeDate(trade);
            if (tradeDate) {
                const dayIndex = tradeDate.getDay();
                dayCounts[dayIndex].trades += 1;
            }
        });

        return dayCounts;
    }, [filteredTrades]);

    return (
        <div className="space-y-6">
            {/* Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex bg-gray-100 dark:bg-[#161B22] p-1 rounded-lg w-max">
                    {['7d', '30d', '90d', '1y', 'all'].map((t) => (
                        <button
                            key={t}
                            onClick={() => setTimeframe(t as any)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${timeframe === t
                                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
                                }`}
                        >
                            {t.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* AI Insights & Recap (Plan Aware) */}
            {(plan !== 'starter') && (
                <div className="grid md:grid-cols-2 gap-6">
                    <WeeklyCoachRecap trades={filteredTrades} plan={plan} />
                    <ProInsights trades={filteredTrades} plan={plan} />
                </div>
            )}
            {(plan === 'starter') && (
                <CompactUpgradePrompt currentPlan={'starter'} feature="Weekly Coach Recap and Pro Insights" onUpgrade={() => { try { (window as any).location.hash = '#upgrade'; } catch { } }} className="mb-4" />
            )}

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Account Balance */}
                <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Est. Balance</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                ${metrics.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </h3>
                        </div>
                        <div className="bg-emerald-100 dark:bg-emerald-900/20 p-2 rounded-full">
                            <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </CardContent>
                </Card>

                {/* Total PnL */}
                <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Total P&L</p>
                            <h3 className={`text-2xl font-bold ${metrics.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                ${metrics.totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </h3>
                            {/* Win Rate Subtitle */}
                            <p className="text-xs text-muted-foreground mt-1">
                                {metrics.winRate.toFixed(1)}% Win Rate
                            </p>
                        </div>
                        <div className={`p-2 rounded-full ${metrics.totalPnL >= 0 ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                            {metrics.totalPnL >= 0 ? <TrendingUp className="w-5 h-5 text-green-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />}
                        </div>
                    </CardContent>
                </Card>

                {/* Profit Factor */}
                <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Profit Factor</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2)}
                            </h3>
                        </div>
                        <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-full">
                            <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                    </CardContent>
                </Card>

                {/* Best Streak */}
                <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Best Streak</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {metrics.bestStreak} <span className="text-sm font-normal text-muted-foreground">Wins</span>
                            </h3>
                        </div>
                        <div className="bg-yellow-100 dark:bg-yellow-900/20 p-2 rounded-full">
                            <Award className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                    </CardContent>
                </Card>
            </div>



            {/* Additional Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Avg PnL / Trade */}
                <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Avg PnL / Trade</p>
                            <h3 className={`text-2xl font-bold ${metrics.avgTrade >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                ${metrics.avgTrade.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </h3>
                        </div>
                        <div className="bg-purple-100 dark:bg-purple-900/20 p-2 rounded-full">
                            <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                    </CardContent>
                </Card>

                {/* Worst Trade */}
                <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Worst Trade</p>
                            <h3 className="text-2xl font-bold text-red-500">
                                ${metrics.worstTrade.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </h3>
                        </div>
                        <div className="bg-red-100 dark:bg-red-900/20 p-2 rounded-full">
                            <ArrowDownRight className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Equity Curve */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <TrendingUp className="w-5 h-5 text-blue-500" />
                            P&L Growth Curve (Cumulative)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={performanceData}>
                                    <defs>
                                        <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(val) => format(new Date(val), 'MMM d')}
                                        stroke="#888888"
                                        fontSize={12}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickFormatter={(val) => `$${val}`}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cumulative P&L']}
                                        labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="pnl"
                                        stroke="#3b82f6"
                                        fillOpacity={1}
                                        fill="url(#pnlGradient)"
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Monthly PnL */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Calendar className="w-5 h-5 text-purple-500" />
                            Monthly Performance
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyPnLData}>
                                    <XAxis dataKey="month" stroke="#888888" fontSize={12} />
                                    <YAxis stroke="#888888" fontSize={12} tickFormatter={(val) => `$${val}`} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px' }}
                                    />
                                    <Bar dataKey="pnl">
                                        {monthlyPnLData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Win/Loss Pie */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <PieChartIcon className="w-5 h-5 text-orange-500" />
                            Outcome Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full flex justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Wins', value: filteredTrades.filter(t => (t.outcome || '').toLowerCase() === 'win').length, fill: '#10b981' },
                                            { name: 'Losses', value: filteredTrades.filter(t => (t.outcome || '').toLowerCase() === 'loss').length, fill: '#ef4444' },
                                            { name: 'Breakeven', value: filteredTrades.filter(t => (t.outcome || '').toLowerCase() === 'breakeven').length, fill: '#6b7280' }
                                        ]}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        <Cell fill="#10b981" />
                                        <Cell fill="#ef4444" />
                                        <Cell fill="#fbbf24" />
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Symbol Performance */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Target className="w-5 h-5 text-indigo-500" />
                            Top Performing Assets
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={symbolPerformanceData} layout="horizontal">
                                    <XAxis type="number" stroke="#888888" fontSize={12} tickFormatter={(val) => `$${val}`} />
                                    <YAxis dataKey="symbol" type="category" width={80} stroke="#888888" fontSize={12} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px' }}
                                    />
                                    <Bar dataKey="pnl" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div >
    );
}
