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

    const index = postList.map((post) => ({
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        date: post.date,
        author: post.author,
        category: post.category,
        keywords: post.keywords,
        content: post.content.replace(/[#*`]/g, "").substring(0, 1000), // Cleaned summary for search
    }));

    return NextResponse.json(index, {
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
    });
}
