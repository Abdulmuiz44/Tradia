// src/app/api/payments/subscriptions/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();

    // Get user's subscriptions from database
    const { data: subscriptions, error } = await supabase
      .from('user_plans')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

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
    const { subscriptionId, planRowId, action, newPlanType } = body;

    if (!subscriptionId && !planRowId) {
      return NextResponse.json({ error: "Subscription identifier is required" }, { status: 400 });
    }

    const supabase = createClient();

    if (action === 'cancel') {
      const { data, error } = await supabase
        .from('user_plans')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .match(
          subscriptionId
            ? {
                or: `flutterwave_subscription_id.eq.${subscriptionId},lemonsqueezy_subscription_id.eq.${subscriptionId}`,
                user_id: session.user.id
              }
            : { id: planRowId, user_id: session.user.id }
        )
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ subscription: data });
    } else if (action === 'update' && newPlanType) {
      const validPlans = ['pro', 'plus', 'elite'];
      if (!validPlans.includes(newPlanType)) {
        return NextResponse.json({ error: "Invalid plan type" }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('user_plans')
        .update({
          plan_type: newPlanType,
          updated_at: new Date().toISOString()
        })
        .match(
          subscriptionId
            ? {
                or: `flutterwave_subscription_id.eq.${subscriptionId},lemonsqueezy_subscription_id.eq.${subscriptionId}`,
                user_id: session.user.id
              }
            : { id: planRowId, user_id: session.user.id }
        )
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ subscription: data });
    } else {
      return NextResponse.json({ error: "Invalid action or missing parameters" }, { status: 400 });
    }
  } catch (error) {
    console.error("Subscription update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update subscription" },
      { status: 500 }
    );
  }
}
