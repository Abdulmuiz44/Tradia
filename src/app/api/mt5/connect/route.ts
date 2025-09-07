// src/app/api/mt5/connect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";

type ConnectBody = {
  server?: string;
  login?: string;
  investorPassword?: string;
  name?: string;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    const userEmail = asString(session?.user?.email);
    if (!userEmail) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "User not authenticated" },
        { status: 401 }
      );
    }

    const supabase = createClient();
    const { data: user, error: userErr } = await supabase
      .from("users")
      .select("id, plan")
      .eq("email", userEmail)
      .maybeSingle();

    if (userErr || !user) {
      return NextResponse.json(
        { error: "USER_NOT_FOUND", message: "User not found" },
        { status: 404 }
      );
    }

    // Plan access enforcement (only pro/plus/elite allowed)
    const { canAccessMT5 } = await import("@/lib/planAccess");
    if (!canAccessMT5((user.plan as any) || "free")) {
      return NextResponse.json(
        {
          error: "UPGRADE_REQUIRED",
          message: "MT5 integration requires Pro, Plus or Elite plan"
        },
        { status: 403 }
      );
    }

    const body = (await req.json()) as ConnectBody;
    const server = asString(body.server);
    const login = asString(body.login);
    const investorPassword = asString(body.investorPassword);
    const name = asString(body.name);

    if (!server || !login || !investorPassword) {
      return NextResponse.json(
        {
          error: "MISSING_FIELDS",
          message: "Server, login, and investor password are required",
          details: {
            server: !server ? "Server is required" : null,
            login: !login ? "Login is required" : null,
            investorPassword: !investorPassword ? "Investor password is required" : null,
          }
        },
        { status: 400 }
      );
    }

    if (!/^\d+$/.test(login)) {
      return NextResponse.json(
        { error: "INVALID_LOGIN", message: "Login must be a valid number" },
        { status: 400 }
      );
    }

    // Validate the connection using our validation endpoint
    try {
      const validationResponse = await fetch(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/mt5/validate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            server,
            login,
            investorPassword,
            name: name || undefined
          }),
        }
      );

      if (!validationResponse.ok) {
        const validationData = await validationResponse.json().catch(() => ({}));
        return NextResponse.json(
          {
            error: "VALIDATION_FAILED",
            message: validationData.message || "Connection validation failed",
            details: validationData
          },
          { status: validationResponse.status }
        );
      }

      const validationData = await validationResponse.json();

      // Store the MT5 account in database
      const accountData = {
        user_id: user.id,
        server,
        login,
        name: name || `MT5 ${login}`,
        state: "connected",
        last_connected_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Upsert the account (update if exists, insert if not)
      const { data: account, error: accountErr } = await supabase
        .from("mt5_accounts")
        .upsert(accountData, {
          onConflict: "user_id,server,login"
        })
        .select()
        .single();

      if (accountErr) {
        console.error("Failed to save MT5 account:", accountErr);
        return NextResponse.json(
          { error: "DATABASE_ERROR", message: "Failed to save account information" },
          { status: 500 }
        );
      }

      console.log(`MT5 account connected for user ${user.id}: ${login}@${server}`);

      return NextResponse.json({
        success: true,
        message: "MT5 account connected successfully",
        account: {
          id: account.id,
          server,
          login,
          name: account.name,
          state: account.state,
          lastConnectedAt: account.last_connected_at,
          accountInfo: validationData.accountInfo
        },
      });

    } catch (validationError) {
      console.error("Validation request failed:", validationError);

      if (validationError instanceof Error && validationError.name === "TypeError") {
        return NextResponse.json(
          {
            error: "VALIDATION_SERVICE_UNAVAILABLE",
            message: "Connection validation service is currently unavailable"
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Failed to validate MT5 connection"
        },
        { status: 500 }
      );
    }

  } catch (err) {
    console.error("MT5 connect API error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: message || "Internal server error" },
      { status: 500 }
    );
  }
}
