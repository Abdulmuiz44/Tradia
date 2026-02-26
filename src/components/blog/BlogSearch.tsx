"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

interface BlogPost {
    slug: string;
    title: string;
    excerpt: string;
    date: string;
    category: string;
    keywords: string[];
    content: string;
}

/**
 * Premium Blog Search Component.
 * Fetches the dynamic index and provides real-time filtering with a glassmorphism design.
 */
export default function BlogSearch() {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function init() {
            try {
                const res = await fetch("/blog/index.json");
                if (!res.ok) throw new Error("Failed to load search index");
                const data = await res.json();
                setPosts(data);
            } catch (err) {
                console.error("Search index fetch error:", err);
                setError("Unable to load search index.");
            } finally {
                setLoading(false);
            }
        }
        init();
    }, []);

    const filtered = useMemo(() => {
        const q = query.toLowerCase().trim();
        if (!q) return [];

        return posts.filter((p) => {
            const searchStr = [
                p.title,
                p.excerpt,
                p.category,
                ...(p.keywords || []),
                p.content
            ].join(" ").toLowerCase();

            return searchStr.includes(q);
        }).slice(0, 10); // Limit to top 10 results for performance/UI
    }, [query, posts]);

    return (
        <div className="w-full max-w-2xl mx-auto mb-12">
            <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition duration-300"></div>
                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search 37+ expert trading guides..."
                        className="w-full h-14 pl-12 pr-4 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-indigo-500/50 text-gray-900 dark:text-white placeholder-gray-500 transition-all shadow-sm backdrop-blur-sm"
                    />
                    <svg
                        className="absolute left-4 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {loading && (
                        <div className="absolute right-4 animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                    )}
                </div>
            </div>

            {/* Search Results Overlay */}
            {query.trim() && (
                <div className="relative mt-2">
                    <div className="absolute z-50 w-full bg-white dark:bg-[#0A0A0B] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
                        {error ? (
                            <div className="p-6 text-center text-red-500 text-sm">
                                {error}
                            </div>
                        ) : filtered.length > 0 ? (
                            <ul className="divide-y divide-gray-100 dark:divide-white/5">
                                {filtered.map((p) => (
                                    <li key={p.slug}>
                                        <Link
                                            href={`/blog/${p.slug}`}
                                            className="flex flex-col p-4 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors group"
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 dark:text-indigo-400">
                                                    {p.category}
                                                </span>
                                                <span className="text-[10px] text-gray-400">•</span>
                                                <span className="text-[10px] text-gray-400">
                                                    {new Date(p.date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>
                                            <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-indigo-300 transition-colors">
                                                {p.title}
                                            </h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-1">
                                                {p.excerpt}
                                            </p>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        ) : !loading && (
                            <div className="p-10 text-center">
                                <p className="text-gray-500 dark:text-gray-400 text-sm">
                                    No articles found matching &quot;{query}&quot;
                                </p>
                                <button
                                    onClick={() => setQuery("")}
                                    className="mt-2 text-xs text-blue-600 dark:text-indigo-400 hover:underline"
                                >
                                    Clear search and view all posts
                                </button>
                            </div>
                        )}
                        <div className="p-3 bg-gray-50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5 text-center">
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">
                                Press Escape to close
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
