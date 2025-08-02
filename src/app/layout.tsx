

import "./globals.css";
import type { Metadata } from "next";
import LayoutClient from "@/components/LayoutClient";

export const metadata: Metadata = {
  title: "Tradia",
  description: "Advanced AI-powered trading assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  );
}
