// app/dashboard/layout.tsx

import { ReactNode } from "react";
import type { Metadata } from "next";
import Footer from "@/components/Footer";  // Import Footer component

export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  alternates: { canonical: "/dashboard" },
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full flex flex-col bg-white text-black dark:bg-[#0f1319] dark:text-white transition-colors">
      <div className="pt-1 px-1 flex-grow">{children}</div>
      <Footer />
    </div>
  );
}
