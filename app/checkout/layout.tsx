import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout — Tradia",
  description: "Secure checkout powered by Lemon Squeezy. Complete your Tradia subscription.",
  alternates: { canonical: "/checkout" },
  // Best practice: avoid indexing checkout pages
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  openGraph: {
    title: "Tradia Checkout",
    description: "Secure payment and subscription activation via Lemon Squeezy.",
    url: "/checkout",
    siteName: "Tradia",
    images: [
      { url: "/TradiaDashboard.png", width: 1200, height: 630, alt: "Tradia secure checkout" },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tradia Checkout",
    description: "Secure payment and subscription activation via Lemon Squeezy.",
    images: ["/TradiaDashboard.png"],
    creator: "@tradia_app",
  },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}

