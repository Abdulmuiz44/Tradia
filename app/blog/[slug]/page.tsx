import { notFound } from "next/navigation";
import { posts } from "../content";
import MarkdownRenderer from "@/components/blog/MarkdownRendererServer";
import { Metadata } from "next";

// Generate static params for all blog posts (pre-render at build time)
export async function generateStaticParams() {
    return Object.keys(posts).map((slug) => ({
        slug,
    }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    const post = posts[params.slug];
    if (!post) return {};
    
    return {
        title: `${post.title} — Tradia Blog`,
        description: post.excerpt,
        keywords: post.keywords,
        authors: [{ name: post.author || "Tradia Team" }],
        openGraph: {
            title: post.title,
            description: post.excerpt,
            type: 'article',
            publishedTime: post.date,
            tags: post.keywords,
            images: [
                {
                    url: "https://tradiaai.app/TradiaDashboard.png",
                    width: 1200,
                    height: 630,
                    alt: post.title,
                }
            ]
        },
        twitter: {
            card: "summary_large_image",
            title: post.title,
            description: post.excerpt,
            images: ["https://tradiaai.app/TradiaDashboard.png"],
        },
        alternates: {
            canonical: `https://tradiaai.app/blog/${params.slug}`,
        }
    };
}

export default function BlogPost({ params }: { params: { slug: string } }) {
    const post = posts[params.slug];
    if (!post) return notFound();

    // JSON-LD structured data for search engines
    const articleSchema = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post.title,
        "description": post.excerpt,
        "image": "https://tradiaai.app/TradiaDashboard.png",
        "datePublished": post.date,
        "dateModified": post.date,
        "author": {
            "@type": "Person",
            "name": post.author || "Tradia Team"
        },
        "publisher": {
            "@type": "Organization",
            "name": "Tradia",
            "logo": {
                "@type": "ImageObject",
                "url": "https://tradiaai.app/TRADIA-LOGO.png"
            }
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `https://tradiaai.app/blog/${params.slug}`
        },
        "keywords": post.keywords.join(", ")
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
            />
            <main className="min-h-screen py-12 md:py-20 px-6 max-w-4xl mx-auto bg-white dark:bg-transparent">
                <article>
                    <div className="mb-12 text-center">
                        <div className="text-sm font-medium text-blue-600 dark:text-indigo-400 mb-4">{new Date(post.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        <h1 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight text-gray-900 dark:text-white">{post.title}</h1>
                    <div className="flex flex-wrap justify-center gap-2 mb-6">
                        {post.keywords.slice(0, 5).map(k => (
                            <span key={k} className="text-xs uppercase tracking-widest px-3 py-1 rounded-full bg-blue-50 dark:bg-white/10 text-blue-600 dark:text-indigo-400 font-semibold">
                                {k}
                            </span>
                        ))}
                    </div>
                    <div className="flex items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>{post.readTime} min read</span>
                        {post.author && <span>by {post.author}</span>}
                    </div>
                </div>

                <div className="prose prose-gray dark:prose-invert max-w-none">
                    <MarkdownRenderer content={post.content} />
                </div>
            </article>

            <div className="mt-20 pt-10 border-t border-gray-200 dark:border-white/10 text-center">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">Ready to master prop trading?</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-xl mx-auto leading-relaxed">Join thousands of traders using Tradia&apos;s AI-powered journal to detect patterns, eliminate psychological trading errors, and pass evaluations.</p>
                <a href="/signup" className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white dark:text-black bg-blue-600 dark:bg-white rounded-full hover:bg-blue-700 dark:hover:bg-gray-100 transition-colors transform hover:scale-105">
                    Start Your Free Analysis
                </a>
            </div>
        </main>
        </>
    );
}

