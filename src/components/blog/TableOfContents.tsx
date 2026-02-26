interface TOCItem {
    id: string;
    text: string;
    level: number;
}

interface TableOfContentsProps {
    content: string;
}

/**
 * Auto-generated Table of Contents from markdown heading structure.
 * Extracts H2 and H3 headings and generates anchor links.
 * Helps AIO systems extract page structure and improves UX.
 */
export default function TableOfContents({ content }: TableOfContentsProps) {
    // Parse headings from markdown content
    const headingRegex = /^(#{2,3})\s+(.+)$/gm;
    const items: TOCItem[] = [];
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
        const level = match[1].length;
        const text = match[2].replace(/\*\*/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
        const id = text
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .substring(0, 80);
        items.push({ id, text, level });
    }

    if (items.length < 3) return null;

    return (
        <nav
            aria-label="Table of Contents"
            className="mb-10 p-5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03]"
        >
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-4">
                In This Article
            </h2>
            <ol className="space-y-1.5 text-sm">
                {items.map((item) => (
                    <li
                        key={item.id}
                        className={item.level === 3 ? "ml-4" : ""}
                    >
                        <a
                            href={`#${item.id}`}
                            className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-indigo-400 transition-colors leading-relaxed block py-0.5"
                        >
                            {item.text}
                        </a>
                    </li>
                ))}
            </ol>
        </nav>
    );
}
