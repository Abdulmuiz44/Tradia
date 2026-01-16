"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
    content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
    return (
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
            {content}
        </ReactMarkdown>
    );
}
