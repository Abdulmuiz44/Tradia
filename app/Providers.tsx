// src/components/Providers.tsx or similar

"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="light">
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
