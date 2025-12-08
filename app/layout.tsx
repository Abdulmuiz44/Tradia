import "./globals.css";
import { Providers } from "@/components/Providers";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from 'next';

// <-- added imports -->
import PostHogInit from "@/components/analytics/PostHogInit";
import FloatingFeedbackButton from "@/components/FloatingFeedbackButton";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import ActivityTracker from "@/components/analytics/ActivityTracker";
import TrialBanner from "@/components/TrialBanner";

/* eslint-disable @next/next/no-page-custom-font */


// SEO Metadata
export const metadata: Metadata = {
  title: "Tradia | AI Trading Performance & Analytics",
  description: "Tradia is your AI trading performance hub: add trades manually or import via CSV to analyze performance, get insights, and improve consistency. Start free and upgrade anytime.",
  keywords: "trade analysis, trading performance, AI trading assistant, trade journal, trading insights, forex trading, trading analytics, CSV import",
  authors: [{ name: "Tradia Team" }],
  creator: "Tradia",
  publisher: "Tradia",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://tradiaai.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Tradia | AI Trading Performance & Analytics",
    description: "AI-powered trade analytics, coaching, CSV import, prop-firm simulator and risk controls — all in one.",
    url: "https://tradiaai.app",
    siteName: "Tradia",
    images: [
      {
        url: "/TradiaDashboard.png",
        width: 1200,
        height: 630,
        alt: "Tradia Trading Dashboard - AI-powered trade analysis platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tradia | AI Trading Performance & Analytics",
    description: "Analyze trades, get AI insights and risk controls, and level up your consistency.",
    images: ["/TradiaDashboard.png"],
    creator: "@tradia_app",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-site-verification-code",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Tradia",
    "description": "AI-powered trading performance assistant. Add trades manually or import via CSV to analyze performance, get AI insights, and improve your trading strategy.",
    "url": "https://tradiaai.app",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "description": "Free plan available, premium plans start at $9/month"
    },
    "creator": {
      "@type": "Organization",
      "name": "Tradia"
    },
    "featureList": [
      "CSV Trade Import",
      "AI Trade Analysis",
      "Performance Metrics",
      "Trade Journal",
      "Risk Management",
      "Mobile Responsive"
    ],
    "screenshot": "https://tradiaai.app/TradiaDashboard.png"
  };

  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Is there a free plan for Tradia?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, Tradia offers a free Starter plan forever that includes core analytics, 30 days of trade history, and CSV trade import functionality. You can upgrade to Pro or Plus plans anytime to access advanced AI features and longer trade storage."
        }
      },
      {
        "@type": "Question",
        "name": "Which brokers are supported by Tradia?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Tradia currently supports CSV imports for all brokers. We're continuously adding support for more broker APIs and direct integrations to make trade analysis even easier."
        }
      },
      {
        "@type": "Question",
        "name": "How does AI help with trading performance?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Tradia's AI analyzes your trade entries, exits, and overall performance to provide actionable insights. It identifies recurring mistakes, suggests optimal position sizing, recommends stop-loss and take-profit levels, and helps you develop more profitable trading strategies based on your historical data."
        }
      },
      {
        "@type": "Question",
        "name": "Is Tradia mobile-friendly for traders?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, Tradia is fully responsive and works seamlessly on mobile devices. You can access your trading analytics, review AI insights, and monitor performance from your smartphone or tablet anywhere in the world."
        }
      },
      {
        "@type": "Question",
        "name": "How secure is my trading data on Tradia?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Your trading data is encrypted and stored securely using industry-standard security practices. We prioritize your privacy and never share your personal trading information with third parties. All data transmission is protected with SSL encryption."
        }
      }
    ]
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Favicon and Icons - Using Tradia Logo */}
        <link rel="icon" href="/Tradia-logo-ONLY.png" type="image/png" sizes="any" />
              <link rel="icon" href="/Tradia-logo-ONLY.png" type="image/png" sizes="16x16" />
              <link rel="icon" href="/Tradia-logo-ONLY.png" type="image/png" sizes="32x32" />
              <link rel="icon" href="/Tradia-logo-ONLY.png" type="image/png" sizes="48x48" />
              <link rel="shortcut icon" href="/Tradia-logo-ONLY.png" type="image/png" />
              <link rel="apple-touch-icon" href="/Tradia-logo-ONLY.png" sizes="180x180" />
              <link rel="apple-touch-icon" href="/Tradia-logo-ONLY.png" sizes="152x152" />
              <link rel="apple-touch-icon" href="/Tradia-logo-ONLY.png" sizes="120x120" />
              <link rel="apple-touch-icon" href="/Tradia-logo-ONLY.png" sizes="76x76" />
              <link rel="mask-icon" href="/Tradia-logo-ONLY.png" color="#0f172a" />        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqStructuredData),
          }}
        />
        <link rel="canonical" href="https://tradiaai.app" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#000000" />
        <meta name="msapplication-TileColor" content="#000000" />
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap" rel="stylesheet" />
      </head>
      <body className="text-[15px] sm:text-[16px] md:text-[17px] leading-[1.45] md:leading-normal">
        <Providers>
          {/* Hector Analytics */}
          <script defer src="https://www.hectoranalytics.com/script.js"></script>
          <PostHogInit />
           <GoogleAnalytics />
          <Analytics />
          {/* App activity tracking */}
          <ActivityTracker />
          {/* Trial banner */}
          <TrialBanner />
          {children}
          {/* keep floating button available app-wide */}
          <FloatingFeedbackButton />
          <SpeedInsights />
        </Providers>
      </body>
    </html>
  );
}