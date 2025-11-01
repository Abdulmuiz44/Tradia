import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { createCheckoutForPlan } from '@/lib/flutterwave.server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { planType, billingCycle = 'monthly', successUrl, cancelUrl } = req.body;

    if (!planType || !['pro', 'plus', 'elite'].includes(planType)) {
      return res.status(400).json({ error: 'Invalid plan type' });
    }

    const checkoutUrl = await createCheckoutForPlan(
      planType,
      session.user.email!,
      session.user.id,
      successUrl,
      cancelUrl,
      'card', // default payment method
      billingCycle
    );

    res.status(200).json({ checkoutUrl });
  } catch (error: any) {
    console.error('Create checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
