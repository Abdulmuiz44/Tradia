import React from "react";
import dynamic from "next/dynamic";

const TradiaAIChat = dynamic(() => import("@/components/ai/TradiaAIChat"), {
  ssr: false,
});

export default function ChatPage() {
return (
<div className="min-h-screen bg-[#061226] text-white">
    <TradiaAIChat />
    </div>
  );
}
