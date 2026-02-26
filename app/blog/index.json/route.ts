import { NextResponse } from "next/server";
import { posts } from "../content";

/**
 * Dynamic JSON Index for all blog posts.
 * Provides a structured, machine-readable feed of all content.
 * Helps AI crawlers and search indexers ingest the entire blog structure in one request.
 */
export async function GET() {
    const postList = Object.values(posts)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const index = {
        name: "Tradia Blog Index",
        description: "Comprehensive index of all blog posts on Tradia - AI Trading Journal & Analytics.",
        url: "https://tradiaai.app/blog",
        lastUpdated: new Date().toISOString(),
        totalPosts: postList.length,
        posts: postList.map((post) => ({
            slug: post.slug,
            title: post.title,
            excerpt: post.excerpt,
            date: post.date,
            author: post.author,
            category: post.category,
            keywords: post.keywords,
            readTime: post.readTime,
            wordCount: post.content.split(/\s+/).length,
            url: `https://tradiaai.app/blog/${post.slug}`,
            metadata: {
                ogImage: "https://tradiaai.app/TradiaDashboard.png",
                canonical: `https://tradiaai.app/blog/${post.slug}`,
            }
        })),
        categories: [...new Set(postList.map(p => p.category))].map(cat => ({
            name: cat,
            slug: cat.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, ""),
            url: `https://tradiaai.app/blog/category/${cat.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}`
        }))
    };

    return NextResponse.json(index, {
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
    });
}
