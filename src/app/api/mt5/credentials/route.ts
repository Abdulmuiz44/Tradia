// src/app/api/mt5/credentials/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { credentialStorage } from "@/lib/credential-storage";
import { MT5Credentials } from "@/types/mt5";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * GET /api/mt5/credentials
 * Get all user's stored MT5 credentials (without passwords)
 */
export async function GET() {
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

    // Get user from database (we'll need this for the credential storage service)
    const supabase = (await import("@/utils/supabase/server")).createClient();
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

    // Get user's credentials
    const credentials = await credentialStorage.getUserCredentials(user.id);

    // Return credentials without sensitive data
    const safeCredentials = credentials.map(cred => ({
      id: cred.id,
      name: cred.name,
      server: cred.server,
      login: cred.login,
      isActive: cred.isActive,
      lastUsedAt: cred.lastUsedAt,
      createdAt: cred.createdAt,
      updatedAt: cred.updatedAt,
      rotationRequired: cred.rotationRequired,
      securityLevel: cred.securityLevel
    }));

    return NextResponse.json({
      success: true,
      credentials: safeCredentials,
      count: safeCredentials.length
    });

  } catch (err) {
    console.error("MT5 credentials GET error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mt5/credentials
 * Store new MT5 credentials securely
 */
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
    const supabase = (await import("@/utils/supabase/server")).createClient();
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

    // Parse request body
    const body = await req.json() as {
      server: string;
      login: string;
      investorPassword: string;
      name?: string;
    };

    // Validate required fields
    if (!body.server || !body.login || !body.investorPassword) {
      return NextResponse.json(
        {
          error: "MISSING_FIELDS",
          message: "Server, login, and investor password are required"
        },
        { status: 400 }
      );
    }

    const credentials: MT5Credentials = {
      server: body.server.trim(),
      login: body.login.trim(),
      password: body.investorPassword,
      name: body.name?.trim()
    };

    // Store credentials securely
    const storedCredential = await credentialStorage.storeCredentials(user.id, credentials);

    // Log security audit
    await supabase.from("mt5_security_audit").insert({
      user_id: user.id,
      credential_id: storedCredential.id,
      action: "credential_created",
      severity: "info",
      metadata: {
        server: credentials.server,
        login: credentials.login,
        security_level: storedCredential.securityLevel
      }
    });

    return NextResponse.json({
      success: true,
      message: "MT5 credentials stored securely",
      credential: {
        id: storedCredential.id,
        name: storedCredential.name,
        server: storedCredential.server,
        login: storedCredential.login,
        securityLevel: storedCredential.securityLevel,
        createdAt: storedCredential.createdAt
      }
    });

  } catch (err) {
    console.error("MT5 credentials POST error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: message || "Failed to store credentials" },
      { status: 500 }
    );
  }
}