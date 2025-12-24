// src/lib/checkout-urls.ts
// Central configuration for LemonSqueezy checkout URLs

export const LEMON_SQUEEZY_CHECKOUT_URLS = {
  pro: {
    monthly: "https://tradia.lemonsqueezy.com/checkout/buy/4e714c31-287d-4dff-8f00-a4e99de0a7b2",
    yearly: "https://tradia.lemonsqueezy.com/checkout/buy/4e714c31-287d-4dff-8f00-a4e99de0a7b2",
  },
  plus: {
    monthly: "https://tradia.lemonsqueezy.com/checkout/buy/7c44062f-4ac6-4c8e-8650-af7e9aa832e2",
    yearly: "https://tradia.lemonsqueezy.com/checkout/buy/7c44062f-4ac6-4c8e-8650-af7e9aa832e2",
  },
  elite: {
    monthly: "https://tradia.lemonsqueezy.com/checkout/buy/f2d05080-421d-4692-b87a-e67cac06aa6c",
    yearly: "https://tradia.lemonsqueezy.com/checkout/buy/f2d05080-421d-4692-b87a-e67cac06aa6c",
  },
} as const;

export function getCheckoutUrl(
  plan: "pro" | "plus" | "elite",
  billing: "monthly" | "yearly"
): string {
  return (LEMON_SQUEEZY_CHECKOUT_URLS[plan]?.[billing] || 
          LEMON_SQUEEZY_CHECKOUT_URLS.plus.monthly);
}
