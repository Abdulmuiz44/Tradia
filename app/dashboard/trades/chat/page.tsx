"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ChatInterface } from "@/components/chat/ChatInterface";
import type { Trade } from "@/types/trade";
import LayoutClient from "@/components/LayoutClient";
import { UserProvider } from "@/context/UserContext";
import { TradeProvider, useTrade } from "@/context/TradeContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ArrowLeft, Loader2 } from "lucide-react";

function TradesChatContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { trades } = useTrade();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    setIsReady(true);
  }, [status, router]);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-[#061226]">
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
    <div className="min-h-screen bg-[#061226] flex flex-col">
      {/* Header with back button */}
      <div className="bg-[#0f172a] border-b border-gray-800 px-4 py-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white hover:text-gray-200 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back to Trades</span>
        </button>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 flex items-center justify-center p-4">
        <ChatInterface
          trades={normalizedTrades}
          mode="analysis"
          conversationId={`chat_${session?.user?.id}_${Date.now()}`}
        />
      </div>
    </div>
  );
}

export default function TradesChatPage() {
  return (
    <LayoutClient>
      <NotificationProvider>
        <UserProvider>
          <TradeProvider>
            <TradesChatContent />
          </TradeProvider>
        </UserProvider>
      </NotificationProvider>
    </LayoutClient>
  );
}
