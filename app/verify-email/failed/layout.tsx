import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  alternates: { canonical: "/verify-email/failed" },
};

export default function VerifyEmailFailedLayout({ children }: { children: React.ReactNode }) {
  return children;
}

