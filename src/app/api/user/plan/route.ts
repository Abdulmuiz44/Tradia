// src/app/api/user/plan/route.ts
import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import { PlanType, PLAN_LIMITS } from "@/lib/planAccess";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();

    // Query the database for user's plan
    const { data: user, error } = await supabase
      .from("users")
      .select("plan")
      .eq("id", session.user.id)
      .single();

    if (error) {
      console.error('Error fetching user plan:', error);
      // Return default plan on error
      return NextResponse.json({
        plan: 'starter',
        isActive: true,
        features: []
      });
    }

    const planType: PlanType = (user.plan as PlanType) || 'starter';

    // Get plan features
    const features = Object.keys(PLAN_LIMITS[planType]).filter(key =>
      PLAN_LIMITS[planType][key as keyof typeof PLAN_LIMITS.starter] === true ||
      (typeof PLAN_LIMITS[planType][key as keyof typeof PLAN_LIMITS.starter] === 'number' &&
        PLAN_LIMITS[planType][key as keyof typeof PLAN_LIMITS.starter] as number > 0)
    );

    return NextResponse.json({
      plan: planType,
      isActive: true,
      features
    });

  } catch (error) {
    console.error('Error in user plan API:', error);
    return NextResponse.json(
      { error: "Failed to fetch user plan" },
      { status: 500 }
    );
  }
}
