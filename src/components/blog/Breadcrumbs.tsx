import Link from "next/link";

interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
}

/**
 * SEO-optimized breadcrumb navigation component.
 * Renders visible breadcrumbs + BreadcrumbList JSON-LD structured data.
 */
export default function Breadcrumbs({ items }: BreadcrumbsProps) {
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": items.map((item, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": item.label,
            ...(item.href ? { "item": `https://tradiaai.app${item.href}` } : {}),
        })),
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
            />
            <nav aria-label="Breadcrumb" className="mb-8">
                <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                    {items.map((item, index) => (
                        <li key={index} className="flex items-center gap-1.5">
                            {index > 0 && (
                                <span className="text-gray-300 dark:text-gray-600" aria-hidden="true">
                                    /
                                </span>
                            )}
                            {item.href && index < items.length - 1 ? (
                                <Link
                                    href={item.href}
                                    className="hover:text-blue-600 dark:hover:text-indigo-400 transition-colors"
                                >
                                    {item.label}
                                </Link>
                            ) : (
                                <span className="text-gray-900 dark:text-gray-200 font-medium truncate max-w-[200px] sm:max-w-none">
                                    {item.label}
                                </span>
                            )}
                        </li>
                    ))}
                </ol>
            </nav>
        </>
    );
}
