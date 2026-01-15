import { notFound } from "next/navigation";
import { posts } from "../content";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ node, ...props }) => <h1 className="text-3xl font-bold text-white mt-12 mb-6" {...props} />,
              h2: ({ node, ...props }) => <h2 className="text-2xl font-bold text-white mt-10 mb-4 border-b border-white/10 pb-2" {...props} />,
              h3: ({ node, ...props }) => <h3 className="text-xl font-bold text-indigo-300 mt-8 mb-3" {...props} />,
              p: ({ node, ...props }) => <p className="mb-6 leading-8" {...props} />,
              ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-6 space-y-2 marker:text-indigo-500" {...props} />,
              ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-6 space-y-2 marker:text-indigo-500" {...props} />,
              blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-indigo-500 pl-6 italic text-gray-400 my-8 py-2 bg-white/5 rounded-r-lg" {...props} />,
              table: ({ node, ...props }) => <div className="overflow-x-auto my-8"><table className="min-w-full divide-y divide-white/10 text-left" {...props} /></div>,
              th: ({ node, ...props }) => <th className="bg-white/10 px-4 py-3 font-semibold text-white" {...props} />,
              td: ({ node, ...props }) => <td className="border-t border-white/10 px-4 py-3" {...props} />,
              a: ({ node, ...props }) => <a className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4" {...props} />,
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>
      </article>

      <div className="mt-20 pt-10 border-t border-white/10 text-center">
        <h3 className="text-xl font-bold text-white mb-4">Ready to upgrade your trading?</h3>
        <p className="text-gray-400 mb-8 max-w-xl mx-auto">Join thousands of traders using Tradia's AI to analyze patterns and master their psychology.</p>
        <a href="/signup" className="inline-flex items-center justify-center px-8 py-3 text-base font-bold text-black bg-white rounded-full hover:bg-gray-200 transition-colors">
          Start Free Analysis
        </a>
      </div>
    </main>
  );
}

