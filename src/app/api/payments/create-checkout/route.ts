// src/app/api/payments/create-checkout/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { createCheckoutForPlan } from "@/lib/flutterwave.server";
import { logPayment } from "@/lib/payment-logging.server";

export async function POST(req: Request) {
  try {
    if (!process.env.FLUTTERWAVE_SECRET_KEY) {
      console.error("FLUTTERWAVE_SECRET_KEY is not set in environment");
    }
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session?.user?.email) {
      try {
        const body = await req.json().catch(() => ({}));
        await (await import("@/lib/payment-logging.server")).logPayment(
          "checkout",
          "warn",
          "Unauthorized create-checkout (no session)",
          { body },
          null
        );
      } catch {}
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      planType,
      paymentMethod,
      successUrl,
      cancelUrl,
      currency = 'USD',
      billingCycle = 'monthly'
    } = body;

    // Validate plan type
    const validPlans = ['pro', 'plus', 'elite'];
    if (!validPlans.includes(planType)) {
      return NextResponse.json({ error: "Invalid plan type" }, { status: 400 });
    }

    // Validate billing cycle
    const validCycles = ['monthly', 'yearly'];
    if (!validCycles.includes(billingCycle)) {
      return NextResponse.json({ error: "Invalid billing cycle" }, { status: 400 });
    }

    // Create checkout session with Flutterwave
    const checkout = await createCheckoutForPlan(
      planType as 'pro' | 'plus' | 'elite',
      session.user.email,
      session.user.id,
      successUrl || `${process.env.NEXTAUTH_URL}/dashboard/billing?success=true`,
      cancelUrl || `${process.env.NEXTAUTH_URL}/dashboard/billing?canceled=true`,
      paymentMethod || 'card',
      billingCycle as 'monthly' | 'yearly',
      currency
    );

    // Log success for observability
    await logPayment(
      "checkout",
      "info",
      "Created Flutterwave checkout",
      { planType, billingCycle, checkoutId: checkout.paymentId, txRef: checkout.txRef },
      session.user.id
    );

    return NextResponse.json({
      checkoutId: checkout.paymentId,
      checkoutUrl: checkout.checkoutUrl,
      txRef: checkout.txRef
    });
  } catch (error) {
    console.error("Checkout creation error:", error);
    try {
      const body = await req.json().catch(() => ({}));
      const { planType, billingCycle } = body || {};
      await logPayment(
        "checkout",
        "error",
        error instanceof Error ? error.message : String(error),
        { planType, billingCycle },
        undefined
      );
    } catch {}
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create checkout" },
      { status: 500 }
    );
  }
}
