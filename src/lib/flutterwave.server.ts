// src/lib/flutterwave.server.ts
import { createClient } from "@/utils/supabase/server";

const API_BASE = "https://api.flutterwave.com/v3";
const SECRET = process.env.FLUTTERWAVE_SECRET_KEY || "";

type BillingCycle = "monthly" | "yearly";

const PLAN_PRICE_MAP: Record<string, { monthly: number; yearly: number }> = {
  pro: { monthly: 9, yearly: 90 },
  plus: { monthly: 19, yearly: 190 },
  elite: { monthly: 39, yearly: 390 },
};

function intervalFromBilling(b: BillingCycle) {
  return b === "monthly" ? "monthly" : "yearly";
}

async function callFlutterwave(path: string, method = "GET", body?: any) {
  if (!SECRET) {
    throw new Error("FLUTTERWAVE_SECRET_KEY not set");
  }
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${SECRET}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      `Flutterwave API error: ${res.status} ${JSON.stringify(json)}`
    );
    throw err;
  }
  return json;
}

export async function getOrCreatePlanOnFlutterwave(
  planKey: string,
  amount: number,
  billing: BillingCycle,
  currency = "USD"
) {
  // planKey e.g. "pro_monthly"
  const supabase = createClient();

  // Check if we already have this plan stored
  const { data: existing } = await supabase
    .from("flutterwave_plans")
    .select("fw_plan_id")
    .eq("plan_key", planKey)
    .single();

  if (existing?.fw_plan_id) {
    return existing.fw_plan_id;
  }

  // Create plan on Flutterwave
  const fwResp = await callFlutterwave("/payment-plans", "POST", {
    amount,
    name: planKey,
    interval: intervalFromBilling(billing),
    currency,
  });

  const fwPlanId = fwResp?.data?.id;
  if (!fwPlanId) {
    throw new Error("Failed to create Flutterwave plan");
  }

  // Store in our DB
  await supabase.from("flutterwave_plans").upsert(
    [
      {
        plan_key: planKey,
        fw_plan_id: fwPlanId,
        amount,
        billing_cycle: billing,
        currency,
        created_at: new Date().toISOString(),
      },
    ],
    { onConflict: "plan_key" }
  );

  return String(fwPlanId);
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
  // compute amount
  const price = PLAN_PRICE_MAP[planType][billingCycle];
  if (!price) throw new Error("Invalid planType/billingCycle");

  const planKey = `${planType}_${billingCycle}`;
  const fwPlanId = await getOrCreatePlanOnFlutterwave(
    planKey,
    price,
    billingCycle,
    currency
  );

  const txRef = `${planKey}_${userId || 'guest'}_${Date.now()}`;

  // Create payment (first payment that will subscribe the customer to the plan)
  const payload: any = {
    tx_ref: txRef,
    amount: price,
    currency,
    redirect_url: successUrl,
    customer: { email: userEmail },
    payment_options: "card,bank,ussd,qr", // let Flutterwave pick allowed methods
    customizations: {
      title: "Tradia subscription",
      description: `${planType} (${billingCycle})`,
    },
    payment_plan: fwPlanId, // important: include plan ID so the customer is subscribed after first payment
    meta: { user_id: userId, plan_type: planType, billing_cycle: billingCycle },
  };

  const resp = await callFlutterwave("/payments", "POST", payload);
  const checkoutUrl = resp?.data?.link || resp?.data?.url || resp?.data?.checkout_url;
  const paymentId = resp?.data?.id;

  if (!checkoutUrl) {
    throw new Error("Failed to get checkout URL from Flutterwave response");
  }

  // persist a pending subscription record into user_plans
  // Only persist pending plan if we have a real user id
  if (userId) {
    const supabase = createClient();
    const { error } = await supabase.from("user_plans").insert({
      user_id: userId,
      plan_type: planType,
      billing_cycle: billingCycle,
      amount: price,
      currency,
      status: "pending",
      tx_ref: txRef,
      flutterwave_plan_id: fwPlanId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to insert pending user_plan:", error);
    }
  }

  return {
    checkoutUrl,
    paymentId: paymentId || txRef,
    txRef,
  };
}

export async function verifyTransactionById(transactionId: string) {
  return await callFlutterwave(`/transactions/${transactionId}/verify`);
}

export async function verifyTransactionByReference(txRef: string) {
  const url = `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`;
  return await callFlutterwave(url);
}
