// src/app/api/mt5/credentials/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { credentialStorage } from "@/lib/credential-storage";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * GET /api/mt5/credentials/[id]
 * Get a specific MT5 credential (without password)
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
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

    const credentialId = params.id;

    // Get the specific credential
    const credential = await credentialStorage.getCredentials(user.id, credentialId);

    if (!credential) {
      return NextResponse.json(
        { error: "CREDENTIAL_NOT_FOUND", message: "Credential not found" },
        { status: 404 }
      );
    }

    // Get credential metadata (without password)
    const credentials = await credentialStorage.getUserCredentials(user.id);
    const metadata = credentials.find(c => c.id === credentialId);

    if (!metadata) {
      return NextResponse.json(
        { error: "CREDENTIAL_NOT_FOUND", message: "Credential metadata not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      credential: {
        id: metadata.id,
        name: metadata.name,
        server: metadata.server,
        login: metadata.login,
        isActive: metadata.isActive,
        lastUsedAt: metadata.lastUsedAt,
        createdAt: metadata.createdAt,
        updatedAt: metadata.updatedAt,
        rotationRequired: metadata.rotationRequired,
        securityLevel: metadata.securityLevel
      }
    });

  } catch (err) {
    console.error("MT5 credential GET error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/mt5/credentials/[id]
 * Update a specific MT5 credential
 */
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
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

    const credentialId = params.id;
    const body = await req.json() as {
      name?: string;
      investorPassword?: string;
    };

    // Get existing credential for comparison
    const existingCredential = await credentialStorage.getCredentials(user.id, credentialId);
    if (!existingCredential) {
      return NextResponse.json(
        { error: "CREDENTIAL_NOT_FOUND", message: "Credential not found" },
        { status: 404 }
      );
    }

    // Prepare updated credential
    const updatedCredential = {
      ...existingCredential,
      name: body.name || existingCredential.name,
      investorPassword: body.investorPassword || existingCredential.investorPassword
    };

    // Store updated credential
    const storedCredential = await credentialStorage.storeCredentials(user.id, updatedCredential);

    // Log security audit
    await supabase.from("mt5_security_audit").insert({
      user_id: user.id,
      credential_id: storedCredential.id,
      action: body.investorPassword ? "credential_password_updated" : "credential_updated",
      severity: body.investorPassword ? "high" : "medium",
      old_values: {
        name: existingCredential.name
      },
      new_values: {
        name: updatedCredential.name
      },
      metadata: {
        password_changed: !!body.investorPassword
      }
    });

    return NextResponse.json({
      success: true,
      message: "MT5 credential updated successfully",
      credential: {
        id: storedCredential.id,
        name: storedCredential.name,
        server: storedCredential.server,
        login: storedCredential.login,
        securityLevel: storedCredential.securityLevel,
        updatedAt: storedCredential.updatedAt
      }
    });

  } catch (err) {
    console.error("MT5 credential PUT error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: message || "Failed to update credential" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mt5/credentials/[id]
 * Delete a specific MT5 credential
 */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
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

    const credentialId = params.id;

    // Get credential info before deletion for audit
    const credential = await credentialStorage.getCredentials(user.id, credentialId);
    if (!credential) {
      return NextResponse.json(
        { error: "CREDENTIAL_NOT_FOUND", message: "Credential not found" },
        { status: 404 }
      );
    }

    // Delete the credential
    await credentialStorage.deleteCredentials(user.id, credentialId);

    // Log security audit
    await supabase.from("mt5_security_audit").insert({
      user_id: user.id,
      credential_id: credentialId,
      action: "credential_deleted",
      severity: "high",
      old_values: {
        server: credential.server,
        login: credential.login,
        name: credential.name
      },
      metadata: {
        deleted_at: new Date().toISOString()
      }
    });

    return NextResponse.json({
      success: true,
      message: "MT5 credential deleted successfully"
    });

  } catch (err) {
    console.error("MT5 credential DELETE error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: message || "Failed to delete credential" },
      { status: 500 }
    );
  }
}