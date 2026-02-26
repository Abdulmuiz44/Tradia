import Link from "next/link";
import { posts } from "./content";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Tradia Blog — AI Trading Journal & Analytics Insights | 37+ Expert Guides",
    description:
        "Expert articles on automated trading analysis, psychology, risk management, prop firm evaluations, and how to use AI to become a profitable trader. Read 37+ in-depth trading guides.",
    keywords: [
        "trading blog",
        "ai trading",
        "forex education",
        "trading psychology",
        "risk management",
        "prop firm evaluation",
        "trading journal",
        "forex trading guide",
        "trading analytics",
    ],
    robots: {
        index: true,
        follow: true,
        nocache: false,
        googleBot: {
            index: true,
            follow: true,
            "max-snippet": -1,
            "max-image-preview": "large",
        },
    },
    openGraph: {
        title: "Tradia Blog — AI Trading Journal & Analytics Insights",
        description:
            "37+ expert articles on trading psychology, risk management, prop firm evaluations, and how to become a profitable trader with AI analysis.",
        type: "website",
        url: "https://tradiaai.app/blog",
        siteName: "Tradia",
        images: [
            {
                url: "https://tradiaai.app/TradiaDashboard.png",
                width: 1200,
                height: 630,
                alt: "Tradia Blog — Expert Trading Guides",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Tradia Blog — AI Trading Journal & Analytics Insights",
        description:
            "37+ expert articles on trading psychology and AI analysis.",
        images: ["https://tradiaai.app/TradiaDashboard.png"],
    },
    alternates: {
        canonical: "https://tradiaai.app/blog",
        types: {
            "application/json": "https://tradiaai.app/blog/index.json",
        },
    },
};

function categoryToSlug(category: string): string {
    return category
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-+$/, "");
}

export default function BlogIndex() {
    const postList = Object.values(posts).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const categories = [...new Set(Object.values(posts).map((p) => p.category))];

    // Pillar content (featured at top)
    const pillarSlugs = [
        "future-of-ai-trading-journals-2026",
        "mastering-trading-psychology-eliminate-tilt",
        "risk-management-101-hidden-math",
    ];
    const pillarPosts = pillarSlugs
        .map((slug) => posts[slug])
        .filter(Boolean);
    const regularPosts = postList.filter(
        (p) => !pillarSlugs.includes(p.slug)
    );

    // Structured data for blog collection
    const blogCollectionSchema = {
        "@context": "https://schema.org",
        "@type": "Blog",
        "name": "Tradia Blog",
        "description":
            "Expert articles on trading psychology, risk management, prop firm evaluations, and AI-powered trading analysis",
        "url": "https://tradiaai.app/blog",
        "inLanguage": "en-US",
        "publisher": {
            "@type": "Organization",
            "name": "Tradia",
            "url": "https://tradiaai.app",
            "logo": {
                "@type": "ImageObject",
                "url": "https://tradiaai.app/TRADIA-LOGO.png",
            },
        },
        "blogPost": postList.map((post) => ({
            "@type": "BlogPosting",
            "headline": post.title,
            "description": post.excerpt,
            "url": `https://tradiaai.app/blog/${post.slug}`,
            "datePublished": post.date,
            "author": {
                "@type": "Person",
                "name": post.author || "Tradia Team",
            },
            "articleSection": post.category,
        })),
    };

    // ItemList schema for rich list results
    const itemListSchema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": postList.map((post, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "url": `https://tradiaai.app/blog/${post.slug}`,
            "name": post.title,
        })),
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(blogCollectionSchema),
                }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(itemListSchema),
                }}
            />
            <main className="min-h-screen py-16 px-6 max-w-6xl mx-auto bg-white dark:bg-transparent">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white">
                        Tradia Blog
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
                        Master prop firm trading with data-driven strategies, psychology
                        tactics, and risk management insights. {postList.length} expert
                        guides to help you pass evaluations and build sustainable profitability.
                    </p>
                </div>

                {/* Category Filter Tabs */}
                <nav
                    aria-label="Blog categories"
                    className="flex flex-wrap justify-center gap-2 mb-12"
                >
                    {categories.map((cat) => {
                        const count = Object.values(posts).filter(
                            (p) => p.category === cat
                        ).length;
                        return (
                            <Link
                                key={cat}
                                href={`/blog/category/${categoryToSlug(cat)}`}
                                className="text-xs uppercase tracking-wider px-4 py-2 rounded-full border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-blue-400 dark:hover:border-indigo-500 hover:text-blue-600 dark:hover:text-indigo-400 hover:bg-blue-50 dark:hover:bg-indigo-500/10 transition-all"
                            >
                                {cat}
                                <span className="ml-1 opacity-60">({count})</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Featured Pillar Content */}
                {pillarPosts.length > 0 && (
                    <section className="mb-16">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-6 text-center">
                            Featured Guides
                        </h2>
                        <div className="grid gap-6 md:grid-cols-3">
                            {pillarPosts.map((p) => (
                                <Link
                                    key={p.slug}
                                    href={`/blog/${p.slug}`}
                                    className="group relative flex flex-col h-full p-6 rounded-2xl border-2 border-blue-200 dark:border-indigo-500/30 bg-gradient-to-br from-blue-50 to-white dark:from-indigo-500/5 dark:to-transparent hover:border-blue-400 dark:hover:border-indigo-500/60 hover:shadow-xl dark:hover:shadow-[0_0_40px_-10px_rgba(99,102,241,0.4)] transition-all duration-300"
                                >
                                    <div className="absolute top-3 right-3 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded bg-blue-100 dark:bg-indigo-500/20 text-blue-700 dark:text-indigo-300 font-bold">
                                        Pillar
                                    </div>
                                    <span className="text-xs font-medium text-blue-600 dark:text-indigo-400 mb-3">
                                        {p.category}
                                    </span>
                                    <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-indigo-300 transition-colors line-clamp-3 leading-snug">
                                        {p.title}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed flex-grow line-clamp-3">
                                        {p.excerpt}
                                    </p>
                                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-4 pt-3 border-t border-blue-100 dark:border-indigo-500/20">
                                        <span>{p.readTime} min</span>
                                        <span>·</span>
                                        <span>{p.content.split(/\s+/).length.toLocaleString()} words</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* All Posts Grid */}
                <section>
                    <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-6 text-center">
                        All Articles
                    </h2>
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {regularPosts.map((p) => (
                            <Link
                                key={p.slug}
                                href={`/blog/${p.slug}`}
                                className="group flex flex-col h-full p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-transparent hover:border-blue-400 dark:hover:border-indigo-500/50 hover:shadow-lg dark:hover:shadow-[0_0_30px_-10px_rgba(99,102,241,0.3)] transition-all duration-300"
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <Link
                                        href={`/blog/category/${categoryToSlug(p.category)}`}
                                        className="text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-white/5 text-blue-600 dark:text-indigo-400 font-semibold hover:bg-blue-100 dark:hover:bg-white/10 transition-colors"
                                    >
                                        {p.category}
                                    </Link>
                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                        {new Date(p.date).toLocaleDateString(undefined, {
                                            year: "numeric",
                                            month: "short",
                                        })}
                                    </span>
                                </div>
                                <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-indigo-300 transition-colors line-clamp-3">
                                    {p.title}
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4 flex-grow line-clamp-3">
                                    {p.excerpt}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-auto pt-4 border-t border-gray-100 dark:border-white/5">
                                    <span>{p.readTime} min read</span>
                                    <span>·</span>
                                    <span>
                                        {p.content.split(/\s+/).length.toLocaleString()} words
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* Bottom CTA */}
                <div className="mt-20 pt-10 border-t border-gray-200 dark:border-white/10 text-center">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                        Ready to turn insights into profits?
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-xl mx-auto leading-relaxed">
                        Join thousands of traders using Tradia&apos;s AI-powered journal
                        to detect patterns, eliminate psychological errors, and pass prop
                        firm evaluations.
                    </p>
                    <a
                        href="/signup"
                        className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white dark:text-black bg-blue-600 dark:bg-white rounded-full hover:bg-blue-700 dark:hover:bg-gray-100 transition-colors transform hover:scale-105"
                    >
                        Start Your Free Analysis
                    </a>
                </div>
            </main>
        </>
    );
}
