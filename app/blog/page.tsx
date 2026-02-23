import Link from "next/link";
import { posts } from "./content";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Tradia Blog — AI Trading Journal & Analytics Insights",
    description: "Expert articles on automated trading analysis, psychology, risk management, and how to use AI to become a profitable trader. Read 48+ in-depth trading guides.",
    keywords: ["trading blog", "ai trading", "forex education", "trading psychology", "risk management", "prop firm evaluation", "trading journal"],
    openGraph: {
        title: "Tradia Blog — AI Trading Journal & Analytics Insights",
        description: "Expert articles on trading psychology, risk management, and how to become a profitable trader with AI analysis.",
        type: "website",
        url: "https://tradiaai.app/blog",
        siteName: "Tradia",
        images: [
            {
                url: "https://tradiaai.app/TradiaDashboard.png",
                width: 1200,
                height: 630,
                alt: "Tradia Blog"
            }
        ]
    },
    twitter: {
        card: "summary_large_image",
        title: "Tradia Blog — AI Trading Journal & Analytics Insights",
        description: "Expert articles on trading psychology and AI analysis.",
        images: ["https://tradiaai.app/TradiaDashboard.png"]
    },
    alternates: {
        canonical: "https://tradiaai.app/blog",
    }
};

export default function BlogIndex() {
    const postList = Object.values(posts).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Structured data for blog collection
    const blogCollectionSchema = {
        "@context": "https://schema.org",
        "@type": "Blog",
        "name": "Tradia Blog",
        "description": "Expert articles on trading psychology, risk management, and AI analysis",
        "url": "https://tradiaai.app/blog",
        "publisher": {
            "@type": "Organization",
            "name": "Tradia",
            "logo": {
                "@type": "ImageObject",
                "url": "https://tradiaai.app/TRADIA-LOGO.png"
            }
        },
        "blogPost": postList.map(post => ({
            "@type": "BlogPosting",
            "headline": post.title,
            "description": post.excerpt,
            "url": `https://tradiaai.app/blog/${post.slug}`,
            "datePublished": post.date,
            "author": {
                "@type": "Person",
                "name": post.author || "Tradia Team"
            }
        }))
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(blogCollectionSchema) }}
            />
            <main className="min-h-screen py-16 px-6 max-w-6xl mx-auto bg-white dark:bg-transparent">
            <div className="text-center mb-16">
                <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white">
                    Tradia Blog
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
                    Master prop firm trading with data-driven strategies, psychology tactics, and risk management insights. Learn how successful traders pass evaluations and build sustainable profitability.
                </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {postList.map((p) => (
                    <Link
                        key={p.slug}
                        href={`/blog/${p.slug}`}
                        className="group flex flex-col h-full p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-transparent hover:border-blue-400 dark:hover:border-indigo-500/50 hover:shadow-lg dark:hover:shadow-[0_0_30px_-10px_rgba(99,102,241,0.3)] transition-all duration-300"
                    >
                        <div className="text-xs font-medium text-blue-600 dark:text-indigo-400 mb-3">{new Date(p.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-indigo-300 transition-colors line-clamp-3">
                            {p.title}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4 flex-grow line-clamp-3">
                            {p.excerpt}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-gray-100 dark:border-white/5">
                            {p.keywords.slice(0, 2).map(k => (
                                <span key={k} className="text-[10px] uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 dark:bg-white/5 text-blue-600 dark:text-indigo-400 font-medium">
                                    {k}
                                </span>
                            ))}
                        </div>
                    </Link>
                ))}
            </div>
            </main>
        </>
    );
}

