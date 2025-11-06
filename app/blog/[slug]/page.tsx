import { notFound } from "next/navigation";

const posts: Record<string, { title: string; content: string; date: string; keywords: string[] }> = {
  "top-5-smc-patterns-ai-analysis": {
    title: "Top 5 SMC Patterns for Forex Traders (With AI Analysis)",
    date: "2025-09-15",
    keywords: ["SMC patterns", "AI trading analysis", "forex"],
    content: `
Strong hands look for clean structure: BOS, FVG, OB, and liquidity grabs. In this quick-start guide, we show 5 SMC patterns and how to validate them with Tradia's AI.

1) Break of Structure (BOS)
2) Fair Value Gap (FVG) alignment
3) Order Block (OB) confirmation
4) Liquidity sweep + displacement
5) Mitigation + continuation

Use CSV imports or MT5 sync to let AI quantify expectancy per pattern. Link your patterns to tagging in Tradia and iterate weekly.
    `.trim(),
  },
  "journal-trades-like-a-pro-template": {
    title: "How to Journal Trades Like a Pro — Free Tradia Template",
    date: "2025-09-16",
    keywords: ["trade journal", "template", "ai trading journal app"],
    content: `
Consistency comes from a repeatable journaling loop. Here's a 500-word starter on fields that matter: setup, context, risk, emotions, outcome, and lesson.

Copy our free template inside Tradia and tag each trade by strategy. The AI coach will surface repeated mistakes and improvement areas in days, not months.
    `.trim(),
  },
  "boost-your-win-rate-tradia-user-stories": {
    title: "Boost Your Win Rate: Real Tradia User Stories",
    date: "2025-09-17",
    keywords: ["win rate", "trader stories", "ai trading journal app"],
    content: `
Traders report double-digit improvements by identifying sizing leaks and pattern variance. This post highlights anonymized before/after snapshots and the exact workflows they used in Tradia.
    `.trim(),
  },
};

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = posts[params.slug];
  if (!post) return {};
  return { title: `${post.title} — Tradia Blog`, description: post.keywords.join(", ") };
}

export default function BlogPost({ params }: { params: { slug: string } }) {
  const post = posts[params.slug];
  if (!post) return notFound();
  return (
    <main className="min-h-screen py-12 px-6 max-w-3xl mx-auto">
      <div className="text-xs text-gray-400">{new Date(post.date).toLocaleDateString()}</div>
      <h1 className="text-3xl font-bold mt-1">{post.title}</h1>
      <article className="prose prose-invert mt-4 text-gray-200 whitespace-pre-wrap">{post.content}</article>
      <div className="mt-6 text-sm text-gray-400">
        Keywords: {post.keywords.join(", ")}
      </div>
    </main>
  );
}

