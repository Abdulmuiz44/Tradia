import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — The #1 AI Trading Journal for Serious Forex & Prop Firm Traders",
  description:
    "Simple pricing for the #1 AI Trading Journal. Start free and upgrade to unlock advanced AI features, extended trade history, and premium analytics.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Tradia Pricing — The #1 AI Trading Journal Plans",
    description:
      "Choose your plan to access the #1 AI Trading Journal for serious Forex and Prop Firm traders. Start free. Upgrade for AI insights, unlimited history, and more.",
    url: "/pricing",
    siteName: "Tradia",
    images: [
      {
        url: "/TradiaDashboard.png",
        width: 1200,
        height: 630,
        alt: "Tradia - The #1 AI Trading Journal for serious Forex & Prop Firm traders pricing",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tradia Pricing — The #1 AI Trading Journal",
    description:
      "Start free with the #1 AI Trading Journal. Upgrade for AI insights, unlimited history, and professional-grade analytics.",
    images: ["/TradiaDashboard.png"],
    creator: "@tradia_app",
  },
  keywords: [
    "AI trading journal pricing",
    "Forex journal pricing",
    "Prop firm trading plans",
    "Trade analysis subscription",
  ],
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
