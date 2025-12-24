// src/lib/lemonsqueezy.server.ts
import { createClient } from "@/utils/supabase/server";

const API_BASE = "https://api.lemonsqueezy.com/v1";
const API_KEY = process.env.LEMONSQUEEZY_API_KEY || "";

type BillingCycle = "monthly" | "yearly";

const PLAN_PRICE_MAP: Record<string, { monthly: number; yearly: number }> = {
  starter: { monthly: 0, yearly: 0 },     // Free plan
  pro: { monthly: 9, yearly: 90 },
  plus: { monthly: 19, yearly: 190 },
  elite: { monthly: 39, yearly: 390 },
};

// LemonSqueezy variant IDs - configure these based on your store setup
// You'll need to create variants in LemonSqueezy and update these IDs
const VARIANT_ID_MAP: Record<string, Record<string, string>> = {
  pro: {
    monthly: process.env.LEMONSQUEEZY_VARIANT_PRO_MONTHLY || "",
    yearly: process.env.LEMONSQUEEZY_VARIANT_PRO_YEARLY || "",
  },
  plus: {
    monthly: process.env.LEMONSQUEEZY_VARIANT_PLUS_MONTHLY || "",
    yearly: process.env.LEMONSQUEEZY_VARIANT_PLUS_YEARLY || "",
  },
  elite: {
    monthly: process.env.LEMONSQUEEZY_VARIANT_ELITE_MONTHLY || "",
    yearly: process.env.LEMONSQUEEZY_VARIANT_ELITE_YEARLY || "",
  },
};

function getCheckoutURL(
  variantId: string,
  email: string,
  userId: string | null,
  successUrl: string,
  cancelUrl: string,
  billingCycle: BillingCycle
) {
  const params = new URLSearchParams({
    checkout_data: JSON.stringify({
      email,
      name: "",
      custom: {
        user_id: userId || "guest",
        billing_cycle: billingCycle,
      },
      redirect_url: successUrl,
    }),
  });

  return `https://checkout.lemonsqueezy.com/checkout/buy/${variantId}?${params.toString()}`;
}

async function callLemonSqueezy(
  path: string,
  method = "GET",
  body?: any
) {
  if (!API_KEY) {
    throw new Error("LEMONSQUEEZY_API_KEY not set");
  }

  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      `LemonSqueezy API error: ${res.status} ${JSON.stringify(json)}`
    );
    throw err;
  }
  return json;
}

export async function getOrCreateProductOnLemonSqueezy(
  planKey: string,
  amount: number,
  billing: BillingCycle,
  currency = "USD"
) {
  // For LemonSqueezy, we work with pre-created variants from the dashboard
  // This function is for compatibility with the old system but LemonSqueezy
  // uses variantId directly instead of creating products dynamically
  
  const supabase = createClient();

  // Check if we already have this product stored
  const { data: existing } = await supabase
    .from("lemonsqueezy_products")
    .select("variant_id")
    .eq("plan_key", planKey)
    .maybeSingle();

  if (existing?.variant_id) {
    return existing.variant_id;
  }

  // For LemonSqueezy, we need the variant ID from environment variables
  const [plan, cycle] = planKey.split("_");
  const variantId = VARIANT_ID_MAP[plan]?.[cycle];
  
  if (!variantId) {
    throw new Error(`LemonSqueezy variant ID not configured for ${planKey}`);
  }

  // Store in our DB for reference
  await supabase.from("lemonsqueezy_products").upsert(
    [
      {
        plan_key: planKey,
        variant_id: variantId,
        amount,
        billing_cycle: billing,
        currency,
        created_at: new Date().toISOString(),
      },
    ],
    { onConflict: "plan_key" }
  );

  return variantId;
}

export async function createCheckoutForPlan(
  planType: "pro" | "plus" | "elite",
  userEmail: string,
  userId: string | null | undefined,
  successUrl: string,
  cancelUrl: string,
  paymentMethod: string,
  billingCycle: BillingCycle,
  currency = "USD",
  trialDays?: number
) {
  // Get amount
  const price = PLAN_PRICE_MAP[planType][billingCycle];
  if (!price) {
    throw new Error("Invalid planType/billingCycle");
  }

  const planKey = `${planType}_${billingCycle}`;
  const variantId = await getOrCreateProductOnLemonSqueezy(
    planKey,
    price,
    billingCycle,
    currency
  );

  const checkoutId = `${planKey}_${userId || "guest"}_${Date.now()}`;

  // Generate the checkout URL directly from LemonSqueezy
  const checkoutUrl = getCheckoutURL(
    variantId,
    userEmail,
    userId || null,
    successUrl,
    cancelUrl,
    billingCycle
  );

  // Persist a pending subscription record into user_plans
  if (userId) {
    const supabase = createClient();
    const { error } = await supabase.from("user_plans").insert({
      user_id: userId,
      plan_type: planType,
      billing_cycle: billingCycle,
      amount: price,
      currency,
      status: "pending",
      checkout_id: checkoutId,
      lemonsqueezy_variant_id: variantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to insert pending user_plan:", error);
    }
  }

  return {
    checkoutUrl,
    checkoutId,
    variantId,
  };
}

export async function verifyWebhookSignature(
  body: string,
  signature: string
): Promise<boolean> {
  // LemonSqueezy uses HMAC-SHA256 for webhook verification
  const crypto = await import("crypto");
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "";

  if (!secret) {
    console.warn("LEMONSQUEEZY_WEBHOOK_SECRET not set");
    return false;
  }

  const hash = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return hash === signature;
}

export async function getSubscriptionDetails(subscriptionId: string) {
  try {
    const response = await callLemonSqueezy(
      `/subscriptions/${subscriptionId}`
    );
    return response.data || null;
  } catch (err) {
    console.error("Failed to fetch subscription details:", err);
    return null;
  }
}

export async function getOrderDetails(orderId: string) {
  try {
    const response = await callLemonSqueezy(`/orders/${orderId}`);
    return response.data || null;
  } catch (err) {
    console.error("Failed to fetch order details:", err);
    return null;
  }
}
