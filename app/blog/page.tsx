import Link from "next/link";
import { posts } from "./content";

export const metadata = {
  title: "Tradia Blog — AI Trading Journal & Analytics Insights",
  description: "Expert articles on automated trading analysis, psychology, risk management, and how to use AI to become a profitable trader.",
  keywords: ["trading blog", "ai trading", "forex education", "trading psychology", "risk management"],
};

export default function BlogIndex() {
  const postList = Object.values(posts).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <main className="min-h-screen py-16 px-6 max-w-6xl mx-auto bg-white dark:bg-transparent">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:to-gray-500">
          Tradia Blog
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Deep dives into trading patterns, psychology, and the future of AI-driven analytics.
          Master the markets with data, not guesswork.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {postList.map((p) => (
          <Link
            key={p.slug}
            href={`/blog/${p.slug}`}
            className="group flex flex-col h-full p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0f1319] hover:border-gray-400 dark:hover:border-indigo-500/50 hover:shadow-lg dark:hover:shadow-[0_0_30px_-10px_rgba(99,102,241,0.3)] transition-all duration-300"
          >
            <div className="text-xs font-medium text-blue-600 dark:text-indigo-400 mb-3">{new Date(p.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-indigo-300 transition-colors">
              {p.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4 flex-grow">
              {p.excerpt}
            </p>
            <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-gray-100 dark:border-white/5">
              {p.keywords.slice(0, 2).map(k => (
                <span key={k} className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-500">
                  {k}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

