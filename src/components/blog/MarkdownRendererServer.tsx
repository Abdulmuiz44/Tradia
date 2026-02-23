import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
    content: string;
}

/**
 * Server-side markdown renderer for SEO optimization
 * Renders markdown on the server, not in the browser
 * This allows search engines to see the full blog content
 */
export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                h1: ({ node, ...props }) => <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mt-12 mb-6 leading-tight" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mt-10 mb-4 border-b border-gray-200 dark:border-white/10 pb-2" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-indigo-300 mt-8 mb-3" {...props} />,
                p: ({ node, ...props }) => <p className="mb-6 leading-8 text-gray-700 dark:text-gray-300" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-6 mb-6 space-y-2 marker:text-blue-600 dark:marker:text-indigo-400 text-gray-700 dark:text-gray-300" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-6 mb-6 space-y-2 marker:text-blue-600 dark:marker:text-indigo-400 text-gray-700 dark:text-gray-300" {...props} />,
                li: ({ node, ...props }) => <li className="mb-2" {...props} />,
                blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-blue-600 dark:border-indigo-500 pl-6 italic text-gray-600 dark:text-gray-400 my-8 py-4 bg-gray-50 dark:bg-white/5 rounded-r-lg" {...props} />,
                table: ({ node, ...props }) => <div className="overflow-x-auto my-8 rounded-lg border border-gray-200 dark:border-white/10"><table className="min-w-full divide-y divide-gray-200 dark:divide-white/10 text-left" {...props} /></div>,
                thead: ({ node, ...props }) => <thead className="bg-gray-100 dark:bg-white/10" {...props} />,
                th: ({ node, ...props }) => <th className="px-4 py-3 font-semibold text-gray-900 dark:text-white text-sm" {...props} />,
                td: ({ node, ...props }) => <td className="border-t border-gray-200 dark:border-white/10 px-4 py-3 text-gray-700 dark:text-gray-300 text-sm" {...props} />,
                a: ({ node, ...props }) => <a className="text-blue-600 dark:text-indigo-400 hover:text-blue-800 dark:hover:text-indigo-300 underline underline-offset-2 transition-colors" {...props} />,
                code: ({ node, ...props }) => <code className="bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-gray-100 px-2 py-1 rounded text-sm font-mono" {...props} />,
                pre: ({ node, ...props }) => <pre className="bg-gray-900 dark:bg-gray-950 text-gray-100 dark:text-gray-100 p-4 rounded-lg overflow-x-auto my-6" {...props} />,
            }}
        >
            {content}
        </ReactMarkdown>
    );
}
