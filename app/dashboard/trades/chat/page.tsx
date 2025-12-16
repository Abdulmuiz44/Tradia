"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { MinimalChatInterface } from "@/components/chat/MinimalChatInterface";
import type { Trade } from "@/types/trade";
import { UserProvider } from "@/context/UserContext";
import { TradeProvider, useTrade } from "@/context/TradeContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { Loader2 } from "lucide-react";

function TradesChatContent() {
    const { data: session, status } = useSession();
    const searchParams = useSearchParams();
    const conversationIdFromUrl = searchParams?.get("id") || null;
    const { trades } = useTrade();
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (status === "authenticated") {
            setIsReady(true);
        }
    }, [status]);

    if (!isReady) {
        return (
            <div className="flex items-center justify-center w-full h-full bg-[#061226]">
                <div className="text-center text-white">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                    Loading your trading data...
                </div>
            </div>
        );
    }

    const normalizedTrades: Trade[] = (trades || []).map((trade: any) => ({
        id: trade.id,
        symbol: trade.symbol,
        direction: trade.direction || "Buy",
        orderType: trade.orderType || "Market",
        openTime: trade.openTime,
        closeTime: trade.closeTime,
        session: trade.session || "",
        lotSize: trade.lotSize || 0,
        entryPrice: trade.entryPrice || 0,
        stopLossPrice: trade.stopLossPrice || 0,
        takeProfitPrice: trade.takeProfitPrice || 0,
        pnl: trade.pnl || 0,
        outcome: trade.outcome || "Breakeven",
        resultRR: trade.resultRR || 0,
        duration: trade.duration || "",
        strategy: trade.strategy || "",
        emotion: trade.emotion || "neutral",
        journalNotes: trade.journalNotes || "",
        notes: trade.notes || "",
        reasonForTrade: trade.reasonForTrade || "",
        created_at: trade.created_at,
        updated_at: trade.updated_at,
    }));

    return (
        <MinimalChatInterface
            trades={normalizedTrades}
            mode="analysis"
            conversationId={conversationIdFromUrl || undefined}
        />
    );
}

export default function TradesChatPage() {
    return (
        <NotificationProvider>
            <UserProvider>
                <TradeProvider>
                    <TradesChatContent />
                </TradeProvider>
            </UserProvider>
        </NotificationProvider>
    );
}
