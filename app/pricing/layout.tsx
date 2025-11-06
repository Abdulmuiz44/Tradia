import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Tradia AI Trading Assistant",
  description:
    "Simple pricing for traders. Start free and upgrade to unlock AI trade reviews, advanced analytics, and multi‑account features.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Tradia Pricing — Simple plans for serious traders",
    description:
      "Choose a plan that fits your trading. Free to start. Upgrade for AI‑powered insights, unlimited history, and more.",
    url: "/pricing",
    siteName: "Tradia",
    images: [
      {
        url: "/TradiaDashboard.png",
        width: 1200,
        height: 630,
        alt: "Tradia pricing and dashboard preview",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tradia Pricing",
    description:
      "Start free. Upgrade for AI trade reviews, longer history and more.",
    images: ["/TradiaDashboard.png"],
    creator: "@tradia_app",
  },
  keywords: [
    "trading pricing",
    "forex journal pricing",
    "AI trading assistant plans",
    "Trading analytics subscription",
  ],
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
