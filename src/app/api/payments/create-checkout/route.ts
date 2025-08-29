// src/app/api/payments/create-checkout/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createCheckoutForPlan } from "@/lib/polar";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { planType, successUrl, cancelUrl } = body;

    // Validate plan type
    const validPlans = ['pro', 'plus', 'elite'];
    if (!validPlans.includes(planType)) {
      return NextResponse.json({ error: "Invalid plan type" }, { status: 400 });
    }

    // Create checkout session
    const checkout = await createCheckoutForPlan(
      planType,
      session.user.email,
      session.user.id,
      successUrl || `${process.env.NEXTAUTH_URL}/dashboard/billing?success=true`,
      cancelUrl || `${process.env.NEXTAUTH_URL}/dashboard/billing?canceled=true`
    );

    return NextResponse.json({
      checkoutId: checkout.id,
      checkoutUrl: checkout.url,
      expiresAt: checkout.expiresAt
    });
  } catch (error) {
    console.error("Checkout creation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create checkout" },
      { status: 500 }
    );
  }
}