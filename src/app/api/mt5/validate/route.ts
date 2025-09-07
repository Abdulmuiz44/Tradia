// src/app/api/mt5/validate/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";

interface ValidationRequest {
  server: string;
  login: string;
  investorPassword: string;
  name?: string;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: Request) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    const userEmail = asString(session?.user?.email);
    const userId = (session?.user as any)?.id;

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "User not authenticated" },
        { status: 401 }
      );
    }

    // Ensure user exists
    const supabase = createClient();
    const { data: user, error: userErr } = await supabase
      .from("users")
      .select("id")
      .eq("email", userEmail)
      .maybeSingle();

    if (userErr || !user) {
      return NextResponse.json(
        { error: "USER_NOT_FOUND", message: "User not found" },
        { status: 404 }
      );
    }

    const body = (await req.json()) as ValidationRequest;

    // Forward request to mtapi.io
    const mtapiUrl = "https://mtapi.io/v1/validate";
    const mt5Response = await fetch(mtapiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        server: body.server,
        login: body.login,
        password: body.investorPassword,
      }),
    });

    const mt5Data = await mt5Response.json();

    if (!mt5Response.ok) {
      return NextResponse.json(
        {
          error: mt5Data.error || "VALIDATION_FAILED",
          message: mt5Data.message || "MT5 validation failed",
        },
        { status: mt5Response.status }
      );
    }

    // ✅ Save / update validated account in Supabase
    const { data: account, error: accErr } = await supabase
      .from("mt5_accounts")
      .upsert(
        {
          user_id: userId,
          server: body.server,
          login: body.login,
          password: body.investorPassword, // ⚠️ TODO: Encrypt in production
          name: body.name || `MT5 ${body.login}`,
          state: "connected",
          account_info: mt5Data.account_info || {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,login,server" }
      )
      .select()
      .single();

    if (accErr) {
      console.error("Failed to save MT5 account:", accErr);
    }

    return NextResponse.json({
      success: true,
      accountInfo: mt5Data.account_info,
      account,
      message: "MT5 connection validated and saved successfully",
    });
  } catch (error) {
    console.error("MT5 validation API error:", error);

    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: "An internal error occurred during validation",
      },
      { status: 500 }
    );
  }
}
