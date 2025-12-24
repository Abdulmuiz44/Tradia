// src/app/api/payments/verify/route.ts
// Note: With LemonSqueezy, verification is primarily handled via webhooks
// This endpoint is kept for compatibility but LemonSqueezy handles most validation server-side
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { logPayment } from "@/lib/payment-logging.server";

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const orderId = str(body?.orderId) || str(body?.order_id) || null;
    const checkoutId = str(body?.checkoutId) || str(body?.checkout_id) || null;

    if (!orderId && !checkoutId) {
      return NextResponse.json({ error: "orderId or checkoutId required" }, { status: 400 });
    }

    // With LemonSqueezy, we primarily trust webhooks for verification
    // This endpoint just checks the DB state
    const supabase = createClient();
    const { data: existing } = await supabase
      .from("user_plans")
      .select("*")
      .or(`lemonsqueezy_order_id.eq.${orderId || null},checkout_id.eq.${checkoutId || null}`)
      .maybeSingle();

    const isSuccess = existing?.status === "active";

    await logPayment(
      "verify",
      "info",
      "Manual verify processed",
      { orderId, checkoutId, status: existing?.status },
      existing?.user_id ?? null
    );

    return NextResponse.json({
      verified: isSuccess,
      status: existing?.status || "pending",
      planType: existing?.plan_type,
    });
  } catch (err) {
    await logPayment(
      "verify",
      "error",
      err instanceof Error ? err.message : String(err),
      null,
      null
    );
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

