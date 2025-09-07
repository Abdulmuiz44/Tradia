// src/app/api/payments/webhook/flutterwave/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { verifyTransactionById, verifyTransactionByReference } from "@/lib/flutterwave.server";

function asString(u: unknown) { return typeof u === "string" ? u.trim() : String(u ?? ""); }

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    let payload: any;
    try { payload = JSON.parse(raw); } catch { payload = {}; }

    // Optional header verification
    const verifHashHeader = req.headers.get("verif-hash") || "";
    const secret = process.env.FLUTTERWAVE_WEBHOOK_SECRET || "";
    if (secret) {
      if (!verifHashHeader || verifHashHeader !== secret) {
        console.warn("Webhook: invalid verif-hash");
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
      }
    }

    const event = payload?.event || payload?.type || "";
    const data = payload?.data || payload?.payload || payload;

    // Find txRef or transaction id
    const txRef = asString(data?.tx_ref || data?.reference || data?.txref || data?.meta?.tx_ref || "");
    const txId = asString(data?.id || data?.transaction_id || data?.tx_id || "");

    // As extra security we verify the transaction with Flutterwave
    let verification: any = null;
    try {
      if (txId) {
        verification = await verifyTransactionById(txId);
      } else if (txRef) {
        verification = await verifyTransactionByReference(txRef);
      }
    } catch (err) {
      console.warn("Failed to verify with Flutterwave API:", err);
      // continue; we may still accept webhook if verif-hash was provided
    }

    // Determine final status
    const verifiedStatus = verification?.data?.status || data?.status || data?.event || "";
    const success = String(verifiedStatus).toLowerCase() === "successful" || String(data?.status).toLowerCase() === "successful";

    // Persist to DB
    const supabase = createClient();

    // Try to find existing pending subscription by tx_ref
    const { data: existing } = await supabase
      .from("user_plans")
      .select("*")
      .eq("tx_ref", txRef)
      .maybeSingle();

    if (event === "subscription" || data?.event === "subscription") {
      // handle subscription-created / subscription-cancelled etc
      if (data?.status === "cancelled" || data?.event === "subscription_cancelled") {
        // mark cancelled
        if (existing) {
          await supabase.from("user_plans").update({
            status: "cancelled",
            updated_at: new Date().toISOString()
          }).eq("tx_ref", txRef);
        }
        return NextResponse.json({ received: true });
      }
    }

    // If payment success -> activate
    if (success) {
      // if we have an existing pending plan, activate it; otherwise create one if metadata present
      if (existing) {
        await supabase.from("user_plans").update({
          status: "active",
          flutterwave_payment_id: txId || data?.id || null,
          flutterwave_transaction: data || verification?.data || null,
          updated_at: new Date().toISOString()
        }).eq("tx_ref", txRef);

        // update users.plan
        const planType = existing.plan_type || data?.meta?.plan_type || data?.meta?.plan || null;
        if (planType) {
          await supabase.from("users").update({ plan: planType }).eq("id", existing.user_id);
        }
      } else {
        // fallback: create user_plans record if we can infer user by email
        const userEmail = data?.customer?.email || data?.customer?.email_address || "";
        if (userEmail) {
          const { data: userRow } = await supabase
            .from("users")
            .select("id")
            .eq("email", userEmail)
            .maybeSingle();

          if (userRow) {
            const planType = data?.meta?.plan_type || data?.meta?.plan || "pro";
            const insert = await supabase.from("user_plans").insert({
              user_id: userRow.id,
              plan_type: planType,
              billing_cycle: data?.meta?.billing_cycle || "monthly",
              amount: data?.amount || null,
              currency: data?.currency || null,
              status: "active",
              tx_ref: txRef,
              flutterwave_payment_id: txId || null,
              flutterwave_transaction: data || verification?.data || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

            await supabase.from("users").update({ plan: planType }).eq("id", userRow.id);
          }
        }
      }

      return NextResponse.json({ received: true });
    }

    // Not successful; just ack to webhook
    return NextResponse.json({ received: true });

  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
