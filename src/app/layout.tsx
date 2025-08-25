"use client";

import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
// import Navbar from "@/components/Navbar";
import { UserProvider } from "@/context/UserContext"; // ✅ import UserProvider
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next"; // <-- added import

// <-- added imports -->
import PostHogInit from "@/components/analytics/PostHogInit";
import FloatingFeedbackButton from "@/components/FloatingFeedbackButton";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SessionProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <UserProvider>
              {/* ✅ wrap everything with UserProvider */}
              <PostHogInit />
              <Analytics />
              {children}
              {/* keep floating button available app-wide */}
              <FloatingFeedbackButton />
              <SpeedInsights />
            </UserProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
