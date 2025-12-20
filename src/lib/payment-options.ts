// src/lib/payment-options.ts
// Client-safe payment method options for rendering in UI.

export type PaymentMethod = {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  iconSvg?: string;
  comingSoon?: boolean;
};

export function getPaymentMethodOptions(): PaymentMethod[] {
  return [
    {
      id: "card",
      name: "Card",
      description: "Pay with debit or credit card",
      icon: "💳",
      iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="24" height="24" aria-hidden>
  <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" stroke-width="1.5"></rect>
  <path d="M2 10h20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
</svg>`,
    },
    {
      id: "bank",
      name: "Bank Transfer",
      description: "Pay via bank transfer",
      icon: "🏦",
      iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="24" height="24" aria-hidden>
  <path d="M3 10h18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
  <path d="M12 3l9 7H3l9-7z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"></path>
  <rect x="4" y="14" width="16" height="6" rx="1" stroke="currentColor" stroke-width="1.5"></rect>
</svg>`,
    },
    {
      id: "ussd",
      name: "USSD",
      description: "Pay using USSD (Nigeria)",
      icon: "⌨️",
      iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="24" height="24" aria-hidden>
  <rect x="6" y="3" width="12" height="18" rx="2" stroke="currentColor" stroke-width="1.5"></rect>
  <circle cx="12" cy="17" r="1" fill="currentColor"></circle>
</svg>`,
    },
    {
      id: "qr",
      name: "QR",
      description: "Scan QR code to pay",
      icon: "🔳",
      iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="24" height="24" aria-hidden>
  <rect x="3" y="3" width="7" height="7" stroke="currentColor" stroke-width="1.5"></rect>
  <rect x="14" y="3" width="7" height="7" stroke="currentColor" stroke-width="1.5"></rect>
  <rect x="3" y="14" width="7" height="7" stroke="currentColor" stroke-width="1.5"></rect>
  <rect x="14" y="14" width="7" height="7" stroke="currentColor" stroke-width="1.5"></rect>
</svg>`,
    },
    {
      id: "mobilemoney",
      name: "Mobile Money",
      description: "Mobile wallet payments",
      icon: "📱",
      iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="24" height="24" aria-hidden>
  <rect x="7" y="2" width="10" height="20" rx="2" stroke="currentColor" stroke-width="1.5"></rect>
  <circle cx="12" cy="18" r="0.6" fill="currentColor"></circle>
</svg>`,
    },
    {
      id: "lemonsqueezy",
      name: "Lemon Squeezy",
      description: "Coming soon",
      icon: "🍋",
      iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="24" height="24" aria-hidden>
  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"></circle>
  <circle cx="12" cy="12" r="3" fill="currentColor"></circle>
</svg>`,
      comingSoon: true,
    },
  ];
}

