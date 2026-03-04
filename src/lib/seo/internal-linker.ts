const KEYWORDS: Record<string, string> = {
    "prop firm": "/blog/category/prop-trading",
    "AI trading journal": "/",
    "mental coach": "/blog/category/psychology",
    "drawdown": "/blog/category/risk-management",
    "TraderSync": "/comparison/tradersync-vs-tradia",
    "Edgewonk": "/comparison/edgewonk-vs-tradia",
    "TradeZella": "/comparison/tradezella-vs-tradia",
    "Tradervue": "/comparison/tradervue-vs-tradia",
    "TradesViz": "/comparison/tradesviz-vs-tradia",
};

/**
 * Automatically injects internal links into a string of content.
 * It only links the first occurrence of each keyword to avoid over-optimization.
 */
export function injectInternalLinks(content: string): string {
    let processedContent = content;

    Object.entries(KEYWORDS).forEach(([keyword, url]) => {
        // Regex to match the keyword only if it's not already inside an <a> tag
        // This is a simplified version; for complex HTML, a more robust parser would be needed.
        const regex = new RegExp(`(?<!<a[^>]*>)\\b${keyword}\\b(?![^<]*</a>)`, 'i');

        if (regex.test(processedContent)) {
            processedContent = processedContent.replace(regex, (match) => {
                return `<a href="${url}" class="text-blue-500 hover:underline hover:text-blue-400 trasition-colors font-medium">${match}</a>`;
            });
        }
    });

    return processedContent;
}
