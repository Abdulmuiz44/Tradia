"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useTrade } from "@/context/TradeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Trash2,
    Search,
    Star,
    RefreshCw,
    Download,
    Filter,
} from "lucide-react";
import { format, isSameDay } from "date-fns";
import type { Trade } from "@/types/trade";

// Helper functions
const parsePL = (v?: string | number | null): number => {
    const str = String(v ?? "0");
    const n = parseFloat(str.replace(/[^0-9\.\-]/g, ""));
    return isNaN(n) ? 0 : n;
};

const getTradeId = (t: Trade | { id?: string | number } | string | number): string => {
    if (typeof t === "string" || typeof t === "number") return String(t);
    const raw = (t as any).id ?? (t as any)._id ?? (t as any).tradeId ?? `${(t as any).symbol ?? "UNK"}-${(t as any).openTime ?? Math.random()}`;
    return String(raw);
};

const fmtDateTime = (d?: string | Date) => {
    if (!d) return "";
    const dt = typeof d === "string" ? new Date(d) : d;
    return isNaN(dt.getTime()) ? "Invalid Date" : format(dt, "dd MMM yyyy, HH:mm");
};

export default function JournalPage() {
    const { data: session } = useSession();
    const { trades = [], updateTrade, deleteTrade, refreshTrades } = useTrade() as any;

    const [filter, setFilter] = useState<"all" | "win" | "loss" | "breakeven">("all");
    const [search, setSearch] = useState("");
    const [pinnedOnly, setPinnedOnly] = useState(false);
    const [pinnedMap, setPinnedMap] = useState<Record<string, boolean>>({});

    const currencyFormatter = useMemo(
        () =>
            new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 2,
            }),
        []
    );

    const normalizedTrades = useMemo(() => {
        return (trades as Trade[]).map((trade) => {
            const openAt = trade.openTime ? new Date(trade.openTime) : null;
            const closeAt = trade.closeTime ? new Date(trade.closeTime) : null;
            const pnlValue = parsePL(trade.pnl);
            const outcomeKey = (trade.outcome ?? "").toLowerCase();
            const symbolKey = (trade.symbol ?? "Unknown").toUpperCase();
            return { ...trade, openAt, closeAt, pnlValue, outcomeKey, symbolKey };
        });
    }, [trades]);

    const filteredTrades = useMemo(() => {
        const searchLower = search.trim().toLowerCase();
        return normalizedTrades
            .filter((trade) => {
                if (filter !== "all" && trade.outcomeKey !== filter) return false;
                if (pinnedOnly && !pinnedMap[getTradeId(trade)]) return false;
                if (searchLower) {
                    const haystack = [
                        trade.symbolKey,
                        trade.outcomeKey,
                        trade.strategy ?? "",
                        (trade as any).note ?? "",
                    ]
                        .join(" ")
                        .toLowerCase();
                    if (!haystack.includes(searchLower)) return false;
                }
                return true;
            })
            .sort((a, b) => {
                const aTime = a.openAt ? a.openAt.getTime() : 0;
                const bTime = b.openAt ? b.openAt.getTime() : 0;
                return bTime - aTime;
            });
    }, [normalizedTrades, filter, pinnedOnly, pinnedMap, search]);

    const togglePin = (tradeId: string) => {
        setPinnedMap((prev) => ({ ...prev, [tradeId]: !prev[tradeId] }));
    };

    const handleDelete = (tradeId: string) => {
        deleteTrade(tradeId);
    };

    const totalPinned = useMemo(() => Object.values(pinnedMap).filter(Boolean).length, [pinnedMap]);

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                <CardContent className="p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                            {[
                                { label: "All", value: "all" },
                                { label: "Wins", value: "win" },
                                { label: "Losses", value: "loss" },
                                { label: "B/E", value: "breakeven" },
                            ].map((item) => (
                                <Button
                                    key={item.value}
                                    size="sm"
                                    variant={filter === item.value ? "default" : "outline"}
                                    onClick={() => setFilter(item.value as typeof filter)}
                                    className={
                                        filter === item.value
                                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                                            : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                                    }
                                >
                                    {item.label}
                                </Button>
                            ))}
                            <Button
                                size="sm"
                                variant={pinnedOnly ? "default" : "outline"}
                                onClick={() => setPinnedOnly((val) => !val)}
                                className={
                                    pinnedOnly
                                        ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                                        : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                                }
                            >
                                <Star className="h-4 w-4 mr-1" />
                                Pinned ({totalPinned})
                            </Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search trades..."
                                    className="h-9 w-48 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0D1117] pl-9 pr-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    type="search"
                                />
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => refreshTrades()}
                                className="border-gray-300 dark:border-gray-600"
                            >
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Trade List */}
            <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="text-gray-900 dark:text-white flex items-center justify-between">
                        <span>Trade Entries ({filteredTrades.length})</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {filteredTrades.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            <p className="text-lg font-medium">No trades found</p>
                            <p className="text-sm mt-1">
                                {search ? "Try adjusting your search" : "Add trades to see them here"}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredTrades.map((trade) => {
                                const id = getTradeId(trade);
                                const isPinned = Boolean(pinnedMap[id]);

                                return (
                                    <div
                                        key={id}
                                        className="p-4 hover:bg-gray-50 dark:hover:bg-[#0D1117] transition-colors"
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                            <div className="flex items-start gap-4">
                                                <button
                                                    onClick={() => togglePin(id)}
                                                    className={`p-1 rounded ${isPinned
                                                            ? "text-yellow-500"
                                                            : "text-gray-400 hover:text-yellow-500"
                                                        }`}
                                                >
                                                    <Star className={`h-5 w-5 ${isPinned ? "fill-current" : ""}`} />
                                                </button>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-900 dark:text-white">
                                                            {trade.symbolKey}
                                                        </span>
                                                        <Badge
                                                            variant={
                                                                trade.outcomeKey === "win"
                                                                    ? "default"
                                                                    : trade.outcomeKey === "loss"
                                                                        ? "destructive"
                                                                        : "secondary"
                                                            }
                                                            className={
                                                                trade.outcomeKey === "win"
                                                                    ? "bg-green-500 hover:bg-green-600"
                                                                    : trade.outcomeKey === "loss"
                                                                        ? "bg-red-500 hover:bg-red-600"
                                                                        : ""
                                                            }
                                                        >
                                                            {trade.outcome || "Unknown"}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                        {fmtDateTime(trade.openAt || trade.openTime)}
                                                    </p>
                                                    {trade.strategy && (
                                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                                            Strategy: {trade.strategy}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p
                                                        className={`font-semibold ${trade.pnlValue >= 0
                                                                ? "text-green-600 dark:text-green-400"
                                                                : "text-red-600 dark:text-red-400"
                                                            }`}
                                                    >
                                                        {currencyFormatter.format(trade.pnlValue)}
                                                    </p>
                                                    {trade.resultRR && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            RR: {trade.resultRR}
                                                        </p>
                                                    )}
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleDelete(id)}
                                                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        {((trade as any).note || trade.journalNotes) && (
                                            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-[#0D1117] p-3 rounded-lg">
                                                {(trade as any).note || trade.journalNotes}
                                            </p>
                                        )}
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
