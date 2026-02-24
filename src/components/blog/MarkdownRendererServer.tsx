import MarkdownIt from "markdown-it";

interface MarkdownRendererProps {
    content: string;
}

/**
 * Server-side markdown renderer for SEO optimization
 * Renders markdown to semantic HTML using markdown-it library
 * The HTML is rendered on the server so search engines see all content
 */
export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
    const md = new MarkdownIt({
        html: true,
        linkify: true,
        typographer: true,
        breaks: true,
    });

    const html = md.render(content);

    return (
        <article className="prose prose-gray dark:prose-invert max-w-none">
            <div
                dangerouslySetInnerHTML={{
                    __html: html,
                }}
                suppressHydrationWarning
            />
        </article>
    );
}
