"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { UserProvider } from "@/context/UserContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { TradeProvider } from "@/context/TradeContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <UserProvider>
          <NotificationProvider>
            <TradeProvider>
              {children}
            </TradeProvider>
          </NotificationProvider>
        </UserProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
