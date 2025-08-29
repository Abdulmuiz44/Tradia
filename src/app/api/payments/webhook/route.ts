// src/app/api/payments/webhook/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getUserPlan } from "@/lib/planAccess";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('polar-signature');

    // TODO: Verify webhook signature for security
    // const isValid = verifyWebhookSignature(body, signature, process.env.POLAR_WEBHOOK_SECRET);

    const event = JSON.parse(body);
    console.log('Polar webhook received:', event.type);

    const supabase = createClient();

    switch (event.type) {
      case 'subscription.created':
        await handleSubscriptionCreated(event.data, supabase);
        break;

      case 'subscription.updated':
        await handleSubscriptionUpdated(event.data, supabase);
        break;

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(event.data, supabase);
        break;

      case 'checkout.succeeded':
        await handleCheckoutSucceeded(event.data, supabase);
        break;

      default:
        console.log('Unhandled webhook event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleSubscriptionCreated(subscription: any, supabase: any) {
  try {
    // Find user by Polar customer ID or email
    const customerId = subscription.customer_id;
    const customerEmail = subscription.customer_email;

    let userId = null;

    // Try to find user by customer ID first (if stored)
    if (customerId) {
      const { data: userByCustomerId } = await supabase
        .from('users')
        .select('id')
        .eq('polar_customer_id', customerId)
        .single();

      if (userByCustomerId) {
        userId = userByCustomerId.id;
      }
    }

    // If not found by customer ID, try by email
    if (!userId && customerEmail) {
      const { data: userByEmail } = await supabase
        .from('users')
        .select('id')
        .eq('email', customerEmail.toLowerCase())
        .single();

      if (userByEmail) {
        userId = userByEmail.id;

        // Store the customer ID for future reference
        await supabase
          .from('users')
          .update({ polar_customer_id: customerId })
          .eq('id', userId);
      }
    }

    if (!userId) {
      console.error('User not found for subscription:', subscription.id);
      return;
    }

    // Determine plan type from price/product
    const planType = determinePlanFromSubscription(subscription);

    // Update user's plan
    await supabase
      .from('user_plans')
      .upsert({
        user_id: userId,
        plan_type: planType,
        polar_subscription_id: subscription.id,
        status: 'active',
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end || false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    console.log(`User ${userId} upgraded to ${planType} plan`);
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}

async function handleSubscriptionUpdated(subscription: any, supabase: any) {
  try {
    // Update subscription details
    await supabase
      .from('user_plans')
      .update({
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end || false,
        updated_at: new Date().toISOString()
      })
      .eq('polar_subscription_id', subscription.id);

    console.log(`Subscription ${subscription.id} updated`);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

async function handleSubscriptionCancelled(subscription: any, supabase: any) {
  try {
    // Mark subscription as cancelled
    await supabase
      .from('user_plans')
      .update({
        status: 'cancelled',
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('polar_subscription_id', subscription.id);

    console.log(`Subscription ${subscription.id} cancelled`);
  } catch (error) {
    console.error('Error handling subscription cancelled:', error);
  }
}

async function handleCheckoutSucceeded(checkout: any, supabase: any) {
  try {
    // This is typically followed by subscription.created, but we can log it
    console.log(`Checkout ${checkout.id} succeeded for customer ${checkout.customer_id || checkout.customer_email}`);
  } catch (error) {
    console.error('Error handling checkout succeeded:', error);
  }
}

function determinePlanFromSubscription(subscription: any): 'free' | 'pro' | 'plus' | 'elite' {
  // This is a simplified version. In production, you'd match against your Polar product/price IDs
  const priceAmount = subscription.price?.amount;

  if (priceAmount >= 19900) return 'elite'; // $199
  if (priceAmount >= 7900) return 'plus';   // $79
  if (priceAmount >= 2900) return 'pro';    // $29

  return 'free';
}

// Webhook signature verification (implement for production)
function verifyWebhookSignature(payload: string, signature: string | null, secret: string | undefined): boolean {
  if (!signature || !secret) return false;

  // Implement HMAC verification here
  // This is a placeholder - implement proper verification for production
  return true;
}