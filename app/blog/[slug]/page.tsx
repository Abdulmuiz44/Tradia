import { notFound } from "next/navigation";
import { posts } from "../content";
import MarkdownRenderer from "@/components/blog/MarkdownRendererServer";
import Breadcrumbs from "@/components/blog/Breadcrumbs";
import TableOfContents from "@/components/blog/TableOfContents";
import RelatedPosts from "@/components/blog/RelatedPosts";
import { Metadata } from "next";

// Force static generation for all blog posts
export const revalidate = 86400; // Revalidate every 24 hours (ISR)

// Generate static params for all blog posts (pre-render at build time)
export async function generateStaticParams() {
    return Object.keys(posts).map((slug) => ({
        slug,
    }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    const post = posts[params.slug];
    if (!post) return {};

    const wordCount = post.content.split(/\s+/).length;
    const site = "https://tradiaai.app";

    return {
        title: `${post.title} — Tradia Blog`,
        description: post.excerpt,
        keywords: post.keywords,
        authors: [{ name: post.author || "Tradia Team" }],
        robots: {
            index: true,
            follow: true,
            nocache: false,
            googleBot: {
                index: true,
                follow: true,
                noimageindex: false,
                "max-snippet": -1,
                "max-image-preview": "large",
                "max-video-preview": -1,
            },
        },
        openGraph: {
            title: post.title,
            description: post.excerpt,
            type: "article",
            publishedTime: post.date,
            modifiedTime: post.date,
            section: post.category,
            tags: post.keywords,
            authors: [post.author || "Tradia Team"],
            images: [
                {
                    url: `${site}/TradiaDashboard.png`,
                    width: 1200,
                    height: 630,
                    alt: post.title,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title: post.title,
            description: post.excerpt,
            images: [`${site}/TradiaDashboard.png`],
        },
        alternates: {
            canonical: `${site}/blog/${params.slug}`,
        },
        other: {
            "article:published_time": post.date,
            "article:modified_time": post.date,
            "article:section": post.category,
            "article:tag": post.keywords.join(","),
            "og:article:word_count": String(wordCount),
        },
    };
}

/**
 * Extract FAQ pairs from markdown content.
 * Looks for Q&A patterns in ## FAQ sections or **Q:** / **A:** patterns.
 */
function extractFAQs(content: string): { question: string; answer: string }[] {
    const faqs: { question: string; answer: string }[] = [];

    // Pattern 1: H3 questions followed by paragraphs (within FAQ/See Also sections)
    const lines = content.split("\n");
    let inFAQSection = false;
    let currentQuestion = "";
    let currentAnswer = "";

    for (const line of lines) {
        const trimmed = line.trim();

        if (/^##\s+(FAQ|Frequently Asked Questions)/i.test(trimmed)) {
            inFAQSection = true;
            continue;
        }
        if (inFAQSection && /^##\s/.test(trimmed) && !/^###/.test(trimmed)) {
            // Hit a new H2, exit FAQ section
            if (currentQuestion && currentAnswer) {
                faqs.push({ question: currentQuestion, answer: currentAnswer.trim() });
            }
            inFAQSection = false;
            continue;
        }
        if (inFAQSection) {
            if (/^###\s/.test(trimmed)) {
                if (currentQuestion && currentAnswer) {
                    faqs.push({ question: currentQuestion, answer: currentAnswer.trim() });
                }
                currentQuestion = trimmed.replace(/^###\s+/, "").replace(/\*\*/g, "").replace(/\?$/, "?");
                if (!currentQuestion.endsWith("?")) currentQuestion += "?";
                currentAnswer = "";
            } else if (trimmed && currentQuestion) {
                currentAnswer += (currentAnswer ? " " : "") + trimmed.replace(/\*\*/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
            }
        }
    }
    if (currentQuestion && currentAnswer) {
        faqs.push({ question: currentQuestion, answer: currentAnswer.trim() });
    }

    return faqs;
}

export default function BlogPost({ params }: { params: { slug: string } }) {
    const post = posts[params.slug];
    if (!post) return notFound();

    const wordCount = post.content.split(/\s+/).length;
    const faqs = extractFAQs(post.content);

    // JSON-LD: BlogPosting (enhanced)
    const articleSchema = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post.title,
        "description": post.excerpt,
        "image": "https://tradiaai.app/TradiaDashboard.png",
        "datePublished": post.date,
        "dateModified": post.date,
        "wordCount": wordCount,
        "articleSection": post.category,
        "inLanguage": "en-US",
        "author": {
            "@type": "Person",
            "name": post.author || "Tradia Team",
            "url": "https://tradiaai.app/about",
        },
        "publisher": {
            "@type": "Organization",
            "name": "Tradia",
            "url": "https://tradiaai.app",
            "logo": {
                "@type": "ImageObject",
                "url": "https://tradiaai.app/TRADIA-LOGO.png",
            },
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `https://tradiaai.app/blog/${params.slug}`,
        },
        "keywords": post.keywords.join(", "),
        "speakable": {
            "@type": "SpeakableSpecification",
            "cssSelector": ["article h1", "article h2", ".key-takeaways"],
        },
        "isPartOf": {
            "@type": "Blog",
            "@id": "https://tradiaai.app/blog",
            "name": "Tradia Blog",
        },
    };

    // JSON-LD: FAQPage (if FAQs were extracted)
    const faqSchema = faqs.length > 0
        ? {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqs.map((faq) => ({
                "@type": "Question",
                "name": faq.question,
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": faq.answer,
                },
            })),
        }
        : null;

    // Find related posts by extracting See Also links from content
    const seeAlsoLinks = (post.content.match(/\[([^\]]+)\]\(\/blog\/([^)]+)\)/g) || [])
        .map((link) => {
            const match = link.match(/\(\/blog\/([^)]+)\)/);
            return match ? match[1] : null;
        })
        .filter(Boolean) as string[];

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
            />
            {faqSchema && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
                />
            )}
            <main className="min-h-screen py-12 md:py-20 px-6 max-w-4xl mx-auto bg-white dark:bg-transparent">
                {/* Breadcrumb Navigation */}
                <Breadcrumbs
                    items={[
                        { label: "Home", href: "/" },
                        { label: "Blog", href: "/blog" },
                        { label: post.category, href: `/blog/category/${post.category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}` },
                        { label: post.title },
                    ]}
                />

                <article itemScope itemType="https://schema.org/BlogPosting">
                    {/* Article Header */}
                    <header className="mb-10 text-center">
                        <div className="text-sm font-medium text-blue-600 dark:text-indigo-400 mb-4">
                            <time itemProp="datePublished" dateTime={post.date}>
                                {new Date(post.date).toLocaleDateString(undefined, {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })}
                            </time>
                        </div>
                        <h1
                            itemProp="headline"
                            className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight text-gray-900 dark:text-white"
                        >
                            {post.title}
                        </h1>
                        <p
                            itemProp="description"
                            className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed"
                        >
                            {post.excerpt}
                        </p>
                        <div className="flex flex-wrap justify-center gap-2 mt-6">
                            {post.keywords.slice(0, 5).map((k) => (
                                <span
                                    key={k}
                                    className="text-xs uppercase tracking-widest px-3 py-1 rounded-full bg-blue-50 dark:bg-white/10 text-blue-600 dark:text-indigo-400 font-semibold"
                                >
                                    {k}
                                </span>
                            ))}
                        </div>
                        <div className="flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-4">
                            <span>{post.readTime} min read</span>
                            <span>·</span>
                            <span>{wordCount.toLocaleString()} words</span>
                            {post.author && (
                                <>
                                    <span>·</span>
                                    <span itemProp="author">by {post.author}</span>
                                </>
                            )}
                        </div>
                    </header>

                    {/* Table of Contents */}
                    <TableOfContents content={post.content} />

                    {/* Article Body */}
                    <div className="prose prose-gray dark:prose-invert max-w-none" itemProp="articleBody">
                        <MarkdownRenderer content={post.content} />
                    </div>

                    <meta itemProp="wordCount" content={String(wordCount)} />
                    <meta itemProp="articleSection" content={post.category} />
                </article>

                {/* Related Posts (Deep Internal Linking) */}
                <RelatedPosts
                    currentSlug={post.slug}
                    currentCategory={post.category}
                    currentKeywords={post.keywords}
                    allPosts={posts}
                    maxPosts={4}
                />

                {/* CTA Section */}
                <div className="mt-16 pt-10 border-t border-gray-200 dark:border-white/10 text-center">
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                        Ready to master prop trading?
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-xl mx-auto leading-relaxed">
                        Join thousands of traders using Tradia&apos;s AI-powered journal to detect patterns,
                        eliminate psychological trading errors, and pass evaluations.
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
