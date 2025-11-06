import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  alternates: { canonical: "/check-email" },
};

export default function CheckEmailLayout({ children }: { children: React.ReactNode }) {
  return children;
}

