// app/api/accounts/route.ts
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { PLAN_LIMITS, normalizePlanType, type PlanType } from "@/lib/planAccess";

export const dynamic = "force-dynamic";

// GET all accounts for authenticated user
export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("trading_accounts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error("GET /api/accounts error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST create new account
export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, account_size, currency, platform, broker, mode } = body;

    // Validate required fields
    if (!name || typeof account_size !== "number") {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get user's plan to check account limit
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("plan")
      .eq("id", user.id)
      .single();

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 400 });
    }

    const userPlan = normalizePlanType(userData?.plan || "starter");
    const planLimits = PLAN_LIMITS[userPlan];
    const maxAccounts = planLimits.maxTradingAccounts === -1 ? Infinity : planLimits.maxTradingAccounts;

    // Check account limit based on plan
    const { data: accountsData, error: countError } = await supabase
      .from("trading_accounts")
      .select("id", { count: "exact" })
      .eq("user_id", user.id);

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 400 });
    }

    if ((accountsData?.length || 0) >= maxAccounts) {
      return NextResponse.json(
        {
          error: `Maximum number of accounts (${maxAccounts}) reached for your ${userPlan.toUpperCase()} plan. Upgrade your plan to create more accounts.`,
          code: "ACCOUNT_LIMIT_REACHED",
          planLimit: maxAccounts,
          currentPlan: userPlan,
        },
        { status: 403 }
      );
    }

    const newAccount = {
      user_id: user.id,
      name,
      account_size,
      currency: currency || "USD",
      platform: platform || "MT5",
      broker: broker || null,
      mode: mode || "manual",
      is_active: true,
      initial_balance: account_size,
    };

    const { data, error } = await supabase
      .from("trading_accounts")
      .insert([newAccount])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("POST /api/accounts error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
