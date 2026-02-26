import type { MetadataRoute } from "next";
import { posts } from "./blog/content";

/**
 * Dynamic sitemap generation for all pages.
 * Automatically discovers all blog posts and includes static pages.
 * Replaces the stale static blog-sitemap.xml.
 */
export default function sitemap(): MetadataRoute.Sitemap {
    const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://tradiaai.app";
    const now = new Date().toISOString().split("T")[0];

    // Static pages
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: `${site}`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 1.0,
        },
        {
            url: `${site}/blog`,
            lastModified: now,
            changeFrequency: "daily",
            priority: 0.95,
        },
        {
            url: `${site}/about`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: `${site}/pricing`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.9,
        },
        {
            url: `${site}/contact`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.6,
        },
        {
            url: `${site}/how-it-works`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: `${site}/docs`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.7,
        },
        {
            url: `${site}/resources`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.7,
        },
        {
            url: `${site}/privacy`,
            lastModified: now,
            changeFrequency: "yearly",
            priority: 0.3,
        },
        {
            url: `${site}/terms`,
            lastModified: now,
            changeFrequency: "yearly",
            priority: 0.3,
        },
    ];

    // All blog post pages
    const blogPages: MetadataRoute.Sitemap = Object.values(posts).map((post) => ({
        url: `${site}/blog/${post.slug}`,
        lastModified: post.date,
        changeFrequency: "monthly" as const,
        priority: getCategoryPriority(post.category),
    }));

    // Blog category pages
    const categories = [...new Set(Object.values(posts).map((p) => p.category))];
    const categoryPages: MetadataRoute.Sitemap = categories.map((cat) => ({
        url: `${site}/blog/category/${encodeURIComponent(cat.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, ""))}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
    }));

    return [...staticPages, ...blogPages, ...categoryPages];
}

function getCategoryPriority(category: string): number {
    const priorities: Record<string, number> = {
        "AI Trading": 0.9,
        "Psychology": 0.9,
        "Risk Management": 0.9,
        "Prop Trading": 0.85,
        "Tools & Software": 0.85,
        "Fundamentals": 0.85,
        "Session Analysis": 0.8,
        "Analytics": 0.8,
        "Trading Strategies": 0.8,
    };
    return priorities[category] || 0.75;
}
