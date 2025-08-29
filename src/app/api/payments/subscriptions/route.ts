// src/app/api/payments/subscriptions/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getUserSubscriptions, cancelUserSubscription, updateUserSubscription } from "@/lib/polar";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's subscriptions
    const subscriptions = await getUserSubscriptions(session.user.id);

    return NextResponse.json({ subscriptions });
  } catch (error) {
    console.error("Subscriptions fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch subscriptions" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { subscriptionId, action, newPlanType } = body;

    if (!subscriptionId) {
      return NextResponse.json({ error: "Subscription ID is required" }, { status: 400 });
    }

    let result;

    if (action === 'cancel') {
      result = await cancelUserSubscription(subscriptionId);
    } else if (action === 'update' && newPlanType) {
      const validPlans = ['pro', 'plus', 'elite'];
      if (!validPlans.includes(newPlanType)) {
        return NextResponse.json({ error: "Invalid plan type" }, { status: 400 });
      }
      result = await updateUserSubscription(subscriptionId, newPlanType);
    } else {
      return NextResponse.json({ error: "Invalid action or missing parameters" }, { status: 400 });
    }

    return NextResponse.json({ subscription: result });
  } catch (error) {
    console.error("Subscription update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update subscription" },
      { status: 500 }
    );
  }
}