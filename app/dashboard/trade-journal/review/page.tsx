"use client";

import React, { useMemo } from "react";
import { useTrade } from "@/context/TradeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clipboard, CheckCircle, XCircle, Clock } from "lucide-react";

export default function ReviewPage() {
    const { trades = [], updateTrade } = useTrade() as any;

    const unreviewedTrades = useMemo(() => {
        return trades.filter((t: any) => !t.reviewed);
    }, [trades]);

    const reviewedTrades = useMemo(() => {
        return trades.filter((t: any) => t.reviewed);
    }, [trades]);

    const markReviewed = (tradeId: string) => {
        const trade = trades.find((t: any) => {
            const id = t.id ?? t._id ?? t.tradeId;
            return String(id) === tradeId;
        });
        if (trade) {
            updateTrade({ ...trade, reviewed: true });
        }
    };

    const markUnreviewed = (tradeId: string) => {
        const trade = trades.find((t: any) => {
            const id = t.id ?? t._id ?? t.tradeId;
            return String(id) === tradeId;
        });
        if (trade) {
            updateTrade({ ...trade, reviewed: false });
        }
    };

    return (
        <div className="space-y-6">
            {/* Progress */}
            <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                                <Clipboard className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {reviewedTrades.length} / {trades.length}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Trades Reviewed</p>
                            </div>
                        </div>
                        <div className="w-48 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-purple-600 dark:bg-purple-500 transition-all"
                                style={{
                                    width: `${trades.length > 0 ? (reviewedTrades.length / trades.length) * 100 : 0}%`,
                                }}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Unreviewed Trades */}
            <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                        <Clock className="h-5 w-5 text-yellow-500" />
                        Pending Review ({unreviewedTrades.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {unreviewedTrades.length === 0 ? (
                        <div className="p-8 text-center">
                            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                            <p className="text-lg font-medium text-gray-900 dark:text-white">All caught up!</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                No trades pending review
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {unreviewedTrades.slice(0, 10).map((trade: any) => {
                                const id = String(trade.id ?? trade._id ?? trade.tradeId);
                                return (
                                    <div
                                        key={id}
                                        className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#0D1117]"
                                    >
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {trade.symbol || "Unknown"}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {trade.outcome} • {trade.strategy || "No strategy"}
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => markReviewed(id)}
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                        >
                                            <CheckCircle className="h-4 w-4 mr-1" />
                                            Mark Reviewed
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Recently Reviewed */}
            <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        Recently Reviewed ({reviewedTrades.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {reviewedTrades.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            No reviewed trades yet
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {reviewedTrades.slice(0, 5).map((trade: any) => {
                                const id = String(trade.id ?? trade._id ?? trade.tradeId);
                                return (
                                    <div
                                        key={id}
                                        className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#0D1117]"
                                    >
                                        <div className="flex items-center gap-3">
                                            <CheckCircle className="h-5 w-5 text-green-500" />
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {trade.symbol || "Unknown"}
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {trade.outcome}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => markUnreviewed(id)}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            <XCircle className="h-4 w-4" />
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
