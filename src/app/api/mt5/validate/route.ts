// src/app/api/mt5/validate/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import { MT5Credentials, ConnectionError } from "@/types/mt5";

interface ValidationRequest {
  server: string;
  login: string;
  investorPassword: string;
  name?: string;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validateCredentials(body: ValidationRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!body.server || body.server.length < 3) {
    errors.push("Server name is required and must be at least 3 characters");
  }

  if (!body.login || !/^\d+$/.test(body.login)) {
    errors.push("Login must be a valid number");
  }

  if (!body.investorPassword || body.investorPassword.length < 4) {
    errors.push("Investor password is required and must be at least 4 characters");
  }

  return { isValid: errors.length === 0, errors };
}

export async function POST(req: Request) {
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

    // Get user from database
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

    // Parse and validate request body
    const body = (await req.json()) as ValidationRequest;
    const validation = validateCredentials(body);

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "INVALID_REQUEST",
          message: "Invalid request parameters",
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // Default backend URL (ensure trailing slash)
    const backendUrl =
      (process.env.MT5_BACKEND_URL || "https://mt5-api.tradiaai.app/").replace(/\/+$/, "");

    try {
      const mt5Response = await fetch(`${backendUrl}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          server: body.server,
          login: parseInt(body.login, 10),
          password: body.investorPassword,
        }),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!mt5Response.ok) {
        const errorData = await mt5Response.json().catch(() => ({}));
        const errorType = mapMT5ErrorToConnectionError(errorData.error);

        return NextResponse.json(
          {
            error: errorType,
            message: errorData.message || "MT5 validation failed",
            details: errorData.details,
          },
          { status: mt5Response.status }
        );
      }

      const mt5Data = await mt5Response.json();

      // Log successful validation
      console.log(
        `MT5 validation successful for user ${user.id}, account ${body.login}@${body.server}`
      );

      return NextResponse.json({
        success: true,
        accountInfo: mt5Data.account_info || mt5Data,
        message: "MT5 connection validated successfully",
      });
    } catch (fetchError) {
      console.error("MT5 backend connection error:", fetchError);

      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        return NextResponse.json(
          {
            error: "TIMEOUT",
            message: "MT5 validation timed out. Please try again.",
          },
          { status: 408 }
        );
      }

      return NextResponse.json(
        {
          error: "BACKEND_UNREACHABLE",
          message:
            "Cannot connect to MT5 backend service. Please ensure the service is running.",
        },
        { status: 503 }
      );
    }
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

function mapMT5ErrorToConnectionError(mt5Error: string): ConnectionError {
  switch (mt5Error?.toUpperCase()) {
    case "INVALID_CREDENTIALS":
    case "WRONG_PASSWORD":
      return "invalid_credentials";
    case "SERVER_UNREACHABLE":
    case "CONNECTION_FAILED":
      return "server_unreachable";
    case "TERMINAL_NOT_FOUND":
    case "MT5_NOT_INSTALLED":
      return "terminal_not_found";
    case "LOGIN_FAILED":
    case "ACCOUNT_DISABLED":
      return "login_failed";
    case "TIMEOUT":
      return "timeout";
    default:
      return "unknown";
  }
}
