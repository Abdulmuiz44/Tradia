import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Tradia Blog - AI Trading Insights & Strategies",
    description: "Expert articles on forex trading, prop firm evaluations, trading psychology, risk management, and AI-powered trading journals.",
    keywords: ["trading blog", "forex trading", "prop firm", "trading psychology", "risk management", "trading journal"],
    robots: {
        index: true,
        follow: true,
        nocache: false,
    },
};

export default function BlogLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
