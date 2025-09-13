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
  const { data } = await supabase
    .from("flutterwave_plans")
    .select("*")
    .eq("plan_key", planKey)
    .maybeSingle();

  if (data && (data as any).flutterwave_plan_id) {
    return (data as any).flutterwave_plan_id as string;
  }

  // create plan on Flutterwave
  const createBody = {
    name: `Tradia ${planKey}`,
    amount,
    interval: intervalFromBilling(billing),
    currency,
  };

  const resp = await callFlutterwave("/payment-plans", "POST", createBody);
  const fwPlanId =
    resp?.data?.id || resp?.data?.plan_id || resp?.id || resp?.data?._id;

  // persist mapping (use upsert to avoid invalid .onConflict chaining)
  await supabase.from("flutterwave_plans").upsert(
    [
      {
        plan_key: planKey,
        flutterwave_plan_id: String(fwPlanId),
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
  currency = "USD"
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
  const link = resp?.data?.link || resp?.data?.url || resp?.data?.checkout_url;

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
      // not fatal for checkout, but log
    }
  }

  return {
    checkoutUrl: link,
    paymentId: resp?.data?.id || resp?.data?.payment_id || null,
    txRef,
  };
}

export async function verifyTransactionById(txId: string) {
  const resp = await callFlutterwave(`/transactions/${txId}/verify`, "GET");
  return resp;
}

export async function verifyTransactionByReference(txRef: string) {
  const resp = await callFlutterwave(
    `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(
      txRef
    )}`,
    "GET"
  );
  return resp;
}

export async function cancelFlutterwaveSubscription(subscriptionId: string) {
  // Best-effort: Flutterwave subscription cancel endpoint
  try {
    const resp = await callFlutterwave(`/subscriptions/${subscriptionId}/cancel`, "POST");
    return resp;
  } catch (err) {
    // Some accounts/plans may not support this; log and continue
    throw err;
  }
}

/* ----------------------------
   Payment method helpers (exported for UI)
   ---------------------------- */

/**
 * PaymentMethod - exported type used by UI components.
 * - icon: optional short emoji/string fallback
 * - iconSvg: optional inline SVG markup (string) which UI can render
 */
export type PaymentMethod = {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  iconSvg?: string;
};

/**
 * Returns available payment method options for the UI.
 * The list is static here but can be adapted to read from config or Flutterwave API if needed.
 */
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
      icon: "📲",
      iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="24" height="24" aria-hidden>
  <rect x="6" y="3" width="12" height="18" rx="2" stroke="currentColor" stroke-width="1.5"></rect>
  <circle cx="12" cy="17" r="1" fill="currentColor"></circle>
</svg>`,
    },
    {
      id: "qr",
      name: "QR",
      description: "Scan QR code to pay",
      icon: "🔲",
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
  ];
}
