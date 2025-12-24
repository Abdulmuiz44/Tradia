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
      id: "lemonsqueezy",
      name: "Lemon Squeezy",
      description: "Recommended for global payments",
      icon: "🍋",
      iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="24" height="24" aria-hidden>
  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"></circle>
  <circle cx="12" cy="12" r="3" fill="currentColor"></circle>
</svg>`,
      comingSoon: false,
    },
  ];
}

