export const CURRENCY_SYMBOLS: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    AUD: "A$",
    CAD: "C$",
};

export function getCurrencySymbol(currencyCode: string = "USD"): string {
    return CURRENCY_SYMBOLS[currencyCode] || "$";
}

export function formatCurrency(amount: number, currencyCode: string = "USD"): string {
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol}${amount.toLocaleString()}`;
}
