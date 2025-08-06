// src/lib/stripe.js
import { loadStripe } from '@stripe/stripe-js';
export async function initStripeCheckout(plan, interval) {
  const resp = await fetch('/api/stripe-checkout', {
    method: 'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ plan, interval })
  });
  const { sessionUrl } = await resp.json();
  window.location = sessionUrl;
}
