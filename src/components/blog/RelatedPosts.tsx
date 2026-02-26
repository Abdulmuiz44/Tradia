import Link from "next/link";
import { BlogPost } from "../../../app/blog/content";

interface RelatedPostsProps {
    currentSlug: string;
    currentCategory: string;
    currentKeywords: string[];
    allPosts: Record<string, BlogPost>;
    maxPosts?: number;
}

/**
 * Smart related posts component for deep internal linking.
 * Ranks posts by relevance: same category first, then keyword overlap.
 * Critical for SEO topical authority and internal link graph.
 */
export default function RelatedPosts({
    currentSlug,
    currentCategory,
    currentKeywords,
    allPosts,
    maxPosts = 4,
}: RelatedPostsProps) {
    const scored = Object.values(allPosts)
        .filter((p) => p.slug !== currentSlug)
        .map((post) => {
            let score = 0;
            // Same category = strong signal
            if (post.category === currentCategory) score += 10;
            // Keyword overlap
            const overlap = post.keywords.filter((k: string) =>
                currentKeywords.some(
                    (ck: string) => ck.toLowerCase() === k.toLowerCase()
                )
            ).length;
            score += overlap * 3;
            // Partial keyword match (word-level)
            const currentWords = new Set(
                currentKeywords.flatMap((k: string) => k.toLowerCase().split(/\s+/))
            );
            const postWords = post.keywords.flatMap((k: string) =>
                k.toLowerCase().split(/\s+/)
            );
            const wordOverlap = postWords.filter((w: string) =>
                currentWords.has(w)
            ).length;
            score += wordOverlap;
            return { post, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, maxPosts);

    if (scored.length === 0) return null;

    return (
        <aside className="mt-16 pt-10 border-t border-gray-200 dark:border-white/10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Related Articles
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
                {scored.map(({ post }) => (
                    <Link
                        key={post.slug}
                        href={`/blog/${post.slug}`}
                        className="group p-5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] hover:border-blue-400 dark:hover:border-indigo-500/50 hover:shadow-md transition-all duration-200"
                    >
                        <span className="text-[10px] uppercase tracking-wider text-blue-600 dark:text-indigo-400 font-semibold">
                            {post.category}
                        </span>
                        <h3 className="mt-2 text-base font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-indigo-300 transition-colors line-clamp-2 leading-snug">
                            {post.title}
                        </h3>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                            {post.excerpt}
                        </p>
                        <span className="mt-3 inline-flex items-center text-xs font-medium text-blue-600 dark:text-indigo-400 group-hover:underline">
                            Read article →
                        </span>
                    </Link>
                ))}
            </div>
        </aside>
    );
}
