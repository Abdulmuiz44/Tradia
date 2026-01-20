"use client";

import React, { useMemo, useState } from "react";
import { useTrade } from "@/context/TradeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    addMonths,
    subMonths,
    isSameDay,
    isSameMonth,
    getDay,
} from "date-fns";

const parsePL = (v?: string | number | null): number => {
    const str = String(v ?? "0");
    const n = parseFloat(str.replace(/[^0-9\.\-]/g, ""));
    return isNaN(n) ? 0 : n;
};

export default function CalendarPage() {
    const { trades = [] } = useTrade() as any;
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDayOfWeek = getDay(monthStart);

    const tradesByDay = useMemo(() => {
        const map: Record<string, { wins: number; losses: number; pnl: number; trades: any[] }> = {};
        trades.forEach((t: any) => {
            const date = t.openTime ? new Date(t.openTime) : null;
            if (!date || isNaN(date.getTime())) return;
            const key = format(date, "yyyy-MM-dd");
            if (!map[key]) map[key] = { wins: 0, losses: 0, pnl: 0, trades: [] };
            map[key].pnl += parsePL(t.pnl);
            map[key].trades.push(t);
            if ((t.outcome ?? "").toLowerCase() === "win") map[key].wins++;
            if ((t.outcome ?? "").toLowerCase() === "loss") map[key].losses++;
        });
        return map;
    }, [trades]);

    const selectedDayTrades = useMemo(() => {
        if (!selectedDay) return [];
        const key = format(selectedDay, "yyyy-MM-dd");
        return tradesByDay[key]?.trades || [];
    }, [selectedDay, tradesByDay]);

    return (
        <div className="space-y-6">
            {/* Calendar Header */}
            <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5 text-cyan-500" />
                            Trade Calendar
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                className="border-gray-300 dark:border-gray-600"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-lg font-semibold text-gray-900 dark:text-white min-w-[140px] text-center">
                                {format(currentMonth, "MMMM yyyy")}
                            </span>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                className="border-gray-300 dark:border-gray-600"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4">
                    {/* Day headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                            <div
                                key={day}
                                className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2"
                            >
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {/* Empty cells for days before month start */}
                        {Array.from({ length: startDayOfWeek }).map((_, i) => (
                            <div key={`empty-${i}`} className="aspect-square" />
                        ))}

                        {/* Days in month */}
                        {daysInMonth.map((day) => {
                            const key = format(day, "yyyy-MM-dd");
                            const dayData = tradesByDay[key];
                            const isToday = isSameDay(day, new Date());
                            const isSelected = selectedDay && isSameDay(day, selectedDay);

                            // Determine border color based on PnL
                            let borderClass = "border border-transparent";
                            if (dayData && dayData.trades.length > 0) {
                                if (dayData.pnl > 0) borderClass = "border-2 border-green-500 dark:border-green-400 bg-green-100 dark:bg-green-900/40 shadow-sm";
                                else if (dayData.pnl < 0) borderClass = "border-2 border-red-500 dark:border-red-400 bg-red-100 dark:bg-red-900/40 shadow-sm";
                                else borderClass = "border-2 border-yellow-500 dark:border-yellow-400 bg-yellow-100 dark:bg-yellow-900/40 shadow-sm";
                            }

                            return (
                                <button
                                    key={key}
                                    onClick={() => setSelectedDay(day)}
                                    className={`aspect-square p-1 rounded-lg text-sm transition-all ${borderClass} ${isSelected
                                        ? "ring-2 ring-blue-600 ring-offset-2 dark:ring-offset-[#161B22]"
                                        : isToday
                                            ? "bg-gray-100 dark:bg-gray-800"
                                            : "hover:bg-gray-50 dark:hover:bg-gray-800"
                                        }`}
                                >
                                    <div className="h-full flex flex-col">
                                        <span
                                            className={`text-xs ${isToday
                                                ? "font-bold text-blue-600 dark:text-blue-400"
                                                : "text-gray-700 dark:text-gray-300"
                                                }`}
                                        >
                                            {format(day, "d")}
                                        </span>
                                        {dayData && (
                                            <div className="flex-1 flex flex-col justify-end">
                                                <div
                                                    className={`text-[10px] font-medium ${dayData.pnl >= 0
                                                        ? "text-green-600 dark:text-green-400"
                                                        : "text-red-600 dark:text-red-400"
                                                        }`}
                                                >
                                                    ${dayData.pnl.toFixed(0)}
                                                </div>
                                                <div className="flex gap-0.5 justify-center">
                                                    {dayData.wins > 0 && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                    )}
                                                    {dayData.losses > 0 && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Selected Day Trades */}
            {selectedDay && (
                <Card className="bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-700">
                    <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                        <CardTitle className="text-gray-900 dark:text-white">
                            Trades on {format(selectedDay, "MMMM d, yyyy")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        {selectedDayTrades.length === 0 ? (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                                No trades on this day
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {selectedDayTrades.map((trade: any, i: number) => (
                                    <div
                                        key={i}
                                        className="p-3 rounded-lg bg-gray-50 dark:bg-[#0D1117] flex items-center justify-between"
                                    >
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {trade.symbol}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {trade.outcome} • {trade.strategy || "No strategy"}
                                            </p>
                                        </div>
                                        <p
                                            className={`font-semibold ${parsePL(trade.pnl) >= 0
                                                ? "text-green-600 dark:text-green-400"
                                                : "text-red-600 dark:text-red-400"
                                                }`}
                                        >
                                            ${parsePL(trade.pnl).toFixed(2)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
