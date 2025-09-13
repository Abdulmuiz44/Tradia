// src/app/api/payments/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { verifyTransactionById, verifyTransactionByReference } from "@/lib/flutterwave.server";
import { logPayment } from "@/lib/payment-logging.server";

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const txRef = str(body?.txRef) || str(body?.tx_ref) || null;
    const txId = str(body?.txId) || str(body?.transaction_id) || null;

    if (!txRef && !txId) {
      return NextResponse.json({ error: "txRef or txId required" }, { status: 400 });
    }

    // Verify with Flutterwave
    let verification: any = null;
    try {
      verification = txId
        ? await verifyTransactionById(txId)
        : await verifyTransactionByReference(txRef!);
    } catch (err) {
      await logPayment("verify", "warn", "Verification call failed", { txRef, txId }, null);
      return NextResponse.json({ verified: false }, { status: 200 });
    }

    const data = verification?.data || {};
    const status = String(data?.status || "").toLowerCase();
    const isSuccess = status === "successful";

    // Idempotently update DB similar to webhook handler
    const supabase = createClient();
    const { data: existing } = await supabase
      .from("user_plans")
      .select("*")
      .eq("tx_ref", txRef || data?.tx_ref || "")
      .maybeSingle();

    if (isSuccess && existing) {
      await supabase
        .from("user_plans")
        .update({
          status: "active",
          flutterwave_payment_id: data?.id || txId || null,
          flutterwave_transaction: data || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      const planType = existing.plan_type || data?.meta?.plan_type || null;
      if (planType && existing.user_id) {
        await supabase.from("users").update({ plan: planType }).eq("id", existing.user_id);
      }
    }

    await logPayment("verify", "info", "Manual verify processed", { txRef, txId, status }, existing?.user_id ?? null);
    return NextResponse.json({ verified: isSuccess, status });
  } catch (err) {
    await logPayment("verify", "error", err instanceof Error ? err.message : String(err), null, null);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

