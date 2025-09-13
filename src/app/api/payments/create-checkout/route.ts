// src/app/api/payments/create-checkout/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { createCheckoutForPlan } from "@/lib/flutterwave.server";
import { logPayment } from "@/lib/payment-logging.server";
import { cookies, headers as nextHeaders } from "next/headers";
import jwt from "jsonwebtoken";
import { createClient } from "@/utils/supabase/server";

type ResolvedUser = { id: string; email: string } | null;

async function resolveUserFromRequest(body?: any): Promise<ResolvedUser> {
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

  // 3) Fallback: accept body-provided identifiers without forcing DB validation (guest checkout)
  try {
    const email = typeof body?.userEmail === 'string' ? body.userEmail : undefined;
    const userId = typeof body?.userId === 'string' ? body.userId : undefined;
    if (email) {
      return { id: userId ? String(userId) : 'guest', email: String(email) };
    }
  } catch {}

  return null;
}

export async function POST(req: Request) {
  // make request body visible in catch scope too
  let body: any = {};
  try {
    if (!process.env.FLUTTERWAVE_SECRET_KEY) {
      console.error("FLUTTERWAVE_SECRET_KEY is not set in environment");
    }
    // Parse body once
    try { body = await req.json(); } catch { body = {}; }

    const resolvedMaybe = await resolveUserFromRequest(body);
    let user: { id: string; email: string } | null = resolvedMaybe;
    if (!user) {
      // As a last resort, extract email directly (guest checkout) if present in body
      const fallbackEmail = typeof body?.userEmail === 'string' ? body.userEmail : undefined;
      if (!fallbackEmail) {
        try {
          await (await import("@/lib/payment-logging.server")).logPayment(
            "checkout",
            "warn",
            "Missing email for checkout",
            { body },
            null
          );
        } catch {}
        return NextResponse.json({ error: "Email required" }, { status: 400 });
      }
      // proceed as guest with provided email
      user = { id: 'guest', email: fallbackEmail };
    }
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

    // Derive safe URLs
    const hdrs = nextHeaders();
    const origin = hdrs.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const successUrlFinal = successUrl || `${origin}/dashboard/billing?success=true`;
    const cancelUrlFinal = cancelUrl || `${origin}/dashboard/billing?canceled=true`;

    // Create checkout session with Flutterwave
    const checkout = await createCheckoutForPlan(
      (String(planType).toLowerCase() as 'pro' | 'plus' | 'elite'),
      user!.email,
      user!.id,
      successUrlFinal,
      cancelUrlFinal,
      paymentMethod || 'card',
      (String(billingCycle).toLowerCase() as 'monthly' | 'yearly'),
      currency
    );

    // Log success for observability
    const userIdForLog = user!.id === 'guest' ? undefined : user!.id;
    await logPayment(
      "checkout",
      "info",
      "Created Flutterwave checkout",
      { planType, billingCycle, checkoutId: checkout.paymentId, txRef: checkout.txRef },
      userIdForLog
    );

    return NextResponse.json({
      checkoutId: checkout.paymentId,
      checkoutUrl: checkout.checkoutUrl,
      txRef: checkout.txRef
    });
  } catch (error) {
    console.error("Checkout creation error:", error);
    try {
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
