import Link from "next/link";
import { notFound } from "next/navigation";
import { posts } from "../../content";
import Breadcrumbs from "@/components/blog/Breadcrumbs";
import { Metadata } from "next";

/**
 * Utility: Convert category name to URL slug
 */
function categoryToSlug(category: string): string {
    return category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
}

/**
 * Utility: Convert URL slug back to category name (best-effort match)
 */
function slugToCategory(slug: string): string | null {
    const allCategories = [...new Set(Object.values(posts).map((p) => p.category))];
    return allCategories.find((cat) => categoryToSlug(cat) === slug) || null;
}

// Pre-render all category pages at build time
export async function generateStaticParams() {
    const categories = [...new Set(Object.values(posts).map((p) => p.category))];
    return categories.map((cat) => ({
        category: categoryToSlug(cat),
    }));
}

export async function generateMetadata({ params }: { params: { category: string } }): Promise<Metadata> {
    const category = slugToCategory(params.category);
    if (!category) return {};

    const categoryPosts = Object.values(posts).filter((p) => p.category === category);
    const site = "https://tradiaai.app";

    return {
        title: `${category} Trading Articles — Tradia Blog`,
        description: `Expert ${category.toLowerCase()} articles for Forex and prop firm traders. ${categoryPosts.length} in-depth guides on ${category.toLowerCase()} strategies, tips, and best practices.`,
        keywords: [
            category.toLowerCase(),
            "trading",
            "forex",
            "prop firm",
            ...categoryPosts.flatMap((p) => p.keywords.slice(0, 2)),
        ],
        robots: {
            index: true,
            follow: true,
            googleBot: { index: true, follow: true },
        },
        openGraph: {
            title: `${category} Trading Articles — Tradia Blog`,
            description: `${categoryPosts.length} expert ${category.toLowerCase()} articles for traders.`,
            type: "website",
            url: `${site}/blog/category/${params.category}`,
        },
        alternates: {
            canonical: `${site}/blog/category/${params.category}`,
        },
    };
}

export default function CategoryPage({ params }: { params: { category: string } }) {
    const category = slugToCategory(params.category);
    if (!category) return notFound();

    const categoryPosts = Object.values(posts)
        .filter((p) => p.category === category)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const allCategories = [...new Set(Object.values(posts).map((p) => p.category))];

    // Structured data for category collection
    const collectionSchema = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": `${category} Trading Articles`,
        "description": `Expert ${category.toLowerCase()} articles for Forex and prop firm traders.`,
        "url": `https://tradiaai.app/blog/category/${params.category}`,
        "isPartOf": {
            "@type": "Blog",
            "@id": "https://tradiaai.app/blog",
            "name": "Tradia Blog",
        },
        "numberOfItems": categoryPosts.length,
        "hasPart": categoryPosts.map((post) => ({
            "@type": "BlogPosting",
            "headline": post.title,
            "url": `https://tradiaai.app/blog/${post.slug}`,
            "datePublished": post.date,
        })),
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
            />
            <main className="min-h-screen py-16 px-6 max-w-6xl mx-auto bg-white dark:bg-transparent">
                <Breadcrumbs
                    items={[
                        { label: "Home", href: "/" },
                        { label: "Blog", href: "/blog" },
                        { label: category },
                    ]}
                />

                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">
                        {category}
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        {categoryPosts.length} expert articles on {category.toLowerCase()} for Forex and prop firm traders.
                    </p>
                </div>

                {/* Category Navigation */}
                <div className="flex flex-wrap justify-center gap-2 mb-12">
                    <Link
                        href="/blog"
                        className="text-xs uppercase tracking-wider px-4 py-2 rounded-full border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-blue-400 dark:hover:border-indigo-500 hover:text-blue-600 dark:hover:text-indigo-400 transition-all"
                    >
                        All Posts
                    </Link>
                    {allCategories.map((cat) => (
                        <Link
                            key={cat}
                            href={`/blog/category/${categoryToSlug(cat)}`}
                            className={`text-xs uppercase tracking-wider px-4 py-2 rounded-full border transition-all ${cat === category
                                    ? "border-blue-500 dark:border-indigo-500 bg-blue-50 dark:bg-indigo-500/10 text-blue-600 dark:text-indigo-400 font-bold"
                                    : "border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-blue-400 dark:hover:border-indigo-500 hover:text-blue-600 dark:hover:text-indigo-400"
                                }`}
                        >
                            {cat}
                        </Link>
                    ))}
                </div>

                {/* Posts Grid */}
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {categoryPosts.map((p) => (
                        <Link
                            key={p.slug}
                            href={`/blog/${p.slug}`}
                            className="group flex flex-col h-full p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-transparent hover:border-blue-400 dark:hover:border-indigo-500/50 hover:shadow-lg dark:hover:shadow-[0_0_30px_-10px_rgba(99,102,241,0.3)] transition-all duration-300"
                        >
                            <div className="text-xs font-medium text-blue-600 dark:text-indigo-400 mb-3">
                                {new Date(p.date).toLocaleDateString(undefined, {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })}
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
                                <span>{p.content.split(/\s+/).length.toLocaleString()} words</span>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Internal Links to Other Categories */}
                <div className="mt-16 pt-10 border-t border-gray-200 dark:border-white/10">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">
                        Explore More Topics
                    </h2>
                    <div className="flex flex-wrap justify-center gap-3">
                        {allCategories
                            .filter((cat) => cat !== category)
                            .map((cat) => {
                                const count = Object.values(posts).filter(
                                    (p) => p.category === cat
                                ).length;
                                return (
                                    <Link
                                        key={cat}
                                        href={`/blog/category/${categoryToSlug(cat)}`}
                                        className="px-5 py-3 rounded-xl border border-gray-200 dark:border-white/10 hover:border-blue-400 dark:hover:border-indigo-500/50 hover:shadow-md transition-all text-sm"
                                    >
                                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                                            {cat}
                                        </span>
                                        <span className="ml-2 text-gray-400 dark:text-gray-500">
                                            ({count})
                                        </span>
                                    </Link>
                                );
                            })}
                    </div>
                </div>
            </main>
        </>
    );
}
