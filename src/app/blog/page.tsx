import Link from "next/link";

const posts = [
  { slug: "top-5-smc-patterns-ai-analysis", title: "Top 5 SMC Patterns for Forex Traders (With AI Analysis)", excerpt: "Spot high-probability SMC setups and let AI quantify your edge.", date: "2025-09-15" },
  { slug: "journal-trades-like-a-pro-template", title: "How to Journal Trades Like a Pro — Free Tradia Template", excerpt: "A simple framework to capture context, emotions, and lessons.", date: "2025-09-16" },
  { slug: "boost-your-win-rate-tradia-user-stories", title: "Boost Your Win Rate: Real Tradia User Stories", excerpt: "Tangible improvements from traders who optimized their process.", date: "2025-09-17" },
];

export const metadata = {
  title: "Tradia Blog — AI Trading Journal App",
  description: "Quick-start guides, trading analytics tips, and real user stories.",
};

export default function BlogIndex() {
  return (
    <main className="min-h-screen py-12 px-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Tradia Blog</h1>
      <p className="text-gray-500 mb-8">Learn patterns, journaling best practices, and how to leverage AI for trading.</p>
      <div className="grid gap-6 md:grid-cols-2">
        {posts.map((p) => (
          <Link key={p.slug} href={`/blog/${p.slug}`} className="block p-5 rounded-xl border border-white/10 hover:border-indigo-500">
            <div className="text-xs text-gray-400">{new Date(p.date).toLocaleDateString()}</div>
            <h2 className="text-xl font-semibold mt-1">{p.title}</h2>
            <p className="text-gray-400 mt-2">{p.excerpt}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}

