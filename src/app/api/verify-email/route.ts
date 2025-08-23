// app/api/verify-email/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin"; // service-role client

/**
 * GET /api/verify-email?token=...
 *
 * Behavior:
 *  - Try to verify using the email_verification_tokens table (preferred).
 *  - If that table/row doesn't exist, fall back to the legacy users.verification_token column.
 *  - Redirect to /verify-email/success on success, /verify-email/failed?reason=... on failure.
 */

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim() || "";

  const successUrl = new URL("/verify-email/success", url);
  const failUrl = new URL("/verify-email/failed", url);

  if (!token) {
    failUrl.searchParams.set("reason", "missing_token");
    return NextResponse.redirect(failUrl);
  }

  const supabase = createAdminClient();

  try {
    // --- Attempt 1: token stored in email_verification_tokens table ---
    // (preferred schema: token + user_id + expires_at + used)
    try {
      const { data: tokenRow, error: tokenErr } = await supabase
        .from("email_verification_tokens")
        .select("id, user_id, expires_at, used")
        .eq("token", token)
        .maybeSingle();

      if (tokenErr) {
        // If the table doesn't exist or other DB error, fall through to legacy lookup.
        // Log for debugging.
        console.error("email_verification_tokens lookup error:", tokenErr);
      } else if (tokenRow) {
        // Validate token (used / expired)
        const now = new Date();
        const expiresAt = tokenRow.expires_at ? new Date(tokenRow.expires_at) : null;

        if (tokenRow.used) {
          failUrl.searchParams.set("reason", "token_already_used");
          return NextResponse.redirect(failUrl);
        }
        if (expiresAt && expiresAt < now) {
          failUrl.searchParams.set("reason", "token_expired");
          return NextResponse.redirect(failUrl);
        }

        // Mark user as verified
        const { error: updUserErr } = await supabase
          .from("users")
          .update({
            email_verified: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", tokenRow.user_id);

        if (updUserErr) {
          console.error("Failed to update users.email_verified:", updUserErr);
          failUrl.searchParams.set("reason", "update_failed");
          return NextResponse.redirect(failUrl);
        }

        // Mark token as used
        const { error: markErr } = await supabase
          .from("email_verification_tokens")
          .update({ used: true })
          .eq("id", tokenRow.id);

        if (markErr) {
          console.error("Failed to mark email_verification_tokens.used:", markErr);
          // It's safer to surface a failure so you can investigate token marking issues.
          failUrl.searchParams.set("reason", "token_mark_failed");
          return NextResponse.redirect(failUrl);
        }

        // success
        return NextResponse.redirect(successUrl);
      }
    } catch (innerErr) {
      // Defensive: any unexpected error reading token table -> fall back to legacy path below
      console.error("Error while checking email_verification_tokens:", innerErr);
    }

    // --- Attempt 2: legacy column on users table: users.verification_token ---
    const { data: user, error: findErr } = await supabase
      .from("users")
      .select("id, email_verified, verification_token")
      .eq("verification_token", token)
      .maybeSingle();

    if (findErr) {
      console.error("Legacy users.verification_token lookup error:", findErr);
      failUrl.searchParams.set("reason", "db_error");
      return NextResponse.redirect(failUrl);
    }

    if (!user) {
      // no token found in either place
      failUrl.searchParams.set("reason", "invalid_or_used_token");
      return NextResponse.redirect(failUrl);
    }

    // already verified? succeed quietly
    if (user.email_verified) {
      return NextResponse.redirect(successUrl);
    }

    // mark verified and clear legacy token
    const { error: updErr } = await supabase
      .from("users")
      .update({
        email_verified: new Date().toISOString(),
        verification_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updErr) {
      console.error("Failed to update (legacy) users table:", updErr);
      failUrl.searchParams.set("reason", "update_failed");
      return NextResponse.redirect(failUrl);
    }

    return NextResponse.redirect(successUrl);
  } catch (err) {
    // Catch-all unexpected error
    console.error("Unexpected verify-email error:", err);
    failUrl.searchParams.set("reason", "internal_error");
    return NextResponse.redirect(failUrl);
  }
}
