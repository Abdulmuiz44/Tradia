import MarkdownIt from "markdown-it";

interface MarkdownRendererProps {
    content: string;
}

/**
 * Server-side markdown renderer with SEO-optimized heading IDs.
 * Generates anchor IDs on headings for Table of Contents linking
 * and search engine heading extraction.
 */
export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
    const md = new MarkdownIt({
        html: true,
        linkify: true,
        typographer: true,
        breaks: true,
    });

    // Add IDs to headings for anchor linking (ToC + AIO extraction)
    const originalHeadingOpen = md.renderer.rules.heading_open;
    md.renderer.rules.heading_open = function (tokens, idx, options, env, self) {
        const token = tokens[idx];
        const nextToken = tokens[idx + 1];
        if (nextToken && nextToken.children) {
            const text = nextToken.children
                .filter((t) => t.type === "text" || t.type === "code_inline")
                .map((t) => t.content)
                .join("");
            const id = text
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, "")
                .replace(/\s+/g, "-")
                .replace(/-+/g, "-")
                .substring(0, 80);
            token.attrSet("id", id);
        }
        if (originalHeadingOpen) {
            return originalHeadingOpen(tokens, idx, options, env, self);
        }
        return self.renderToken(tokens, idx, options);
    };

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
