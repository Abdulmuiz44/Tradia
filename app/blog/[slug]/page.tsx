import { notFound } from "next/navigation";
import { posts } from "../content";
import MarkdownRenderer from "@/components/blog/MarkdownRenderer";

export async function generateMetadata({ params }: { params: { slug: string } }) {
    const post = posts[params.slug];
    if (!post) return {};
    return {
        title: `${post.title} — Tradia Blog`,
        description: post.excerpt,
        openGraph: {
            title: post.title,
            description: post.excerpt,
            type: 'article',
            publishedTime: post.date,
            tags: post.keywords
        }
    };
}

export default function BlogPost({ params }: { params: { slug: string } }) {
    const post = posts[params.slug];
    if (!post) return notFound();

    return (
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
    );
}

