"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const TradiaAIChat = dynamic(() => import("@/components/ai/TradiaAIChat"), {
  ssr: false,
});

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Require authentication before allowing chat
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#061226] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show nothing while redirecting unauthenticated users
  if (status === "unauthenticated") {
    return null;
  }

  // Only render chat if authenticated
  return (
    <div className="min-h-screen bg-[#061226] text-white">
      <TradiaAIChat />
    </div>
  );
}
