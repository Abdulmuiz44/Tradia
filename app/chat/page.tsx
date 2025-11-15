import React from "react";
import dynamic from "next/dynamic";

// Use the new emotion-based coach for /chat
const EmotionCoachChat = dynamic(() => import("@/components/ai/EmotionCoachChat"), {
  ssr: false,
});

export default function ChatPage() {
return (
    <EmotionCoachChat />
  );
}
