import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  alternates: { canonical: "/verify-email/success" },
};

export default function VerifyEmailSuccessLayout({ children }: { children: React.ReactNode }) {
  return children;
}

