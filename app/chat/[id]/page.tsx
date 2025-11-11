import React from "react";
import dynamic from "next/dynamic";

const TradiaAIChat = dynamic(() => import("@/components/ai/TradiaAIChat"), {
  ssr: false,
});

interface ChatPageProps {
  params: {
    id: string;
  };
}

export default function ChatConversationPage({ params }: ChatPageProps) {
  return (
    <div className="min-h-screen bg-[#061226] text-white">
      <TradiaAIChat activeConversationId={params.id} />
    </div>
  );
}
