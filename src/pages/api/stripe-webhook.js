// src/pages/api/stripe-webhook.js
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET);
import { unlockFeaturesForUser } from '../../lib/featureLock';

export default async function handler(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) { return res.status(400).send(`Webhook error: ${err.message}`); }
  if (event.type === 'checkout.session.completed') {
    const sess = event.data.object;
    unlockFeaturesForUser(sess.customer_email, /* compute expiry from sess */);
  }
  res.json({ received: true });
}
