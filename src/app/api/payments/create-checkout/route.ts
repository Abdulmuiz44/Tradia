// src/app/api/payments/create-checkout/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { createCheckoutForPlan } from "@/lib/flutterwave.server";
import { logPayment } from "@/lib/payment-logging.server";
import { cookies, headers as nextHeaders } from "next/headers";
import jwt from "jsonwebtoken";
import { createClient } from "@/utils/supabase/server";

async function resolveUserFromRequest() {
  // 1) Try NextAuth session
  const session = await getServerSession(authOptions);
  if (session?.user?.id && session.user.email) {
    return { id: String(session.user.id), email: String(session.user.email) };
  }

  // 2) Try custom JWT used by middleware (Authorization header or cookies 'session'/'app_token')
  try {
    const hdrs = nextHeaders();
    const auth = hdrs.get("authorization");
    const rawToken = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    const c = cookies();
    const cookieToken = c.get("session")?.value || c.get("app_token")?.value || null;
    const token = rawToken || cookieToken || null;
    const secret = process.env.JWT_SECRET || "dev_secret";
    if (token && secret) {
      const payload = jwt.verify(token, secret) as any;
      const email = typeof payload?.email === "string" ? payload.email : null;
      if (email) {
        const supabase = createClient();
        const { data: user } = await supabase
          .from("users")
          .select("id, email")
          .eq("email", email)
          .maybeSingle();
        if (user?.id) {
          return { id: String(user.id), email: String(user.email) };
        }
      }
    }
  } catch (err) {
    // ignore and continue
  }

  return null;
}

export async function POST(req: Request) {
  try {
    if (!process.env.FLUTTERWAVE_SECRET_KEY) {
      console.error("FLUTTERWAVE_SECRET_KEY is not set in environment");
    }
    const resolved = await resolveUserFromRequest();
    if (!resolved) {
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
      resolved.email,
      resolved.id,
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
      resolved.id
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
