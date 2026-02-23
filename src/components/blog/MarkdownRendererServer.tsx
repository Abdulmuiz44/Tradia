import MarkdownIt from "markdown-it";

interface MarkdownRendererProps {
    content: string;
}

/**
 * Server-side markdown renderer for SEO optimization
 * Renders markdown on the server, not in the browser
 * This allows search engines to see the full blog content
 */
export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
    const md = new MarkdownIt({
        html: true,
        linkify: true,
        typographer: true,
    });

    const html = md.render(content);

    return (
        <div
            className="prose prose-gray dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
