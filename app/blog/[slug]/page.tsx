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
    <main className="min-h-screen py-20 px-6 max-w-4xl mx-auto">
      <article className="prose prose-invert prose-lg max-w-none">
        <div className="mb-10 text-center">
          <div className="text-sm font-medium text-indigo-400 mb-4">{new Date(post.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight text-white">{post.title}</h1>
          <div className="flex flex-wrap justify-center gap-2">
            {post.keywords.map(k => (
              <span key={k} className="text-xs uppercase tracking-wider px-3 py-1 rounded-full bg-white/10 text-gray-300">
                {k}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-12 text-gray-300 leading-relaxed space-y-6">
          <MarkdownRenderer content={post.content} />
        </div>
      </article>

      <div className="mt-20 pt-10 border-t border-white/10 text-center">
        <h3 className="text-xl font-bold text-white mb-4">Ready to upgrade your trading?</h3>
        <p className="text-gray-400 mb-8 max-w-xl mx-auto">Join thousands of traders using Tradia&apos;s AI to analyze patterns and master their psychology.</p>
        <a href="/signup" className="inline-flex items-center justify-center px-8 py-3 text-base font-bold text-black bg-white rounded-full hover:bg-gray-200 transition-colors">
          Start Free Analysis
        </a>
      </div>
    </main>
  );
}

