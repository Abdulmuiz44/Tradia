// app/api/auth/verify-email/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminSupabase } from "@/utils/supabase/admin";

/**
 * Verification endpoint
 *
 * GET /api/auth/verify-email?token=...
 * (Also supports POST JSON body { token: "..." } if you later want to call it server-to-server.)
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const token = url.searchParams.get("token") || "";

  if (!token) {
    console.warn("verify-email: missing token");
    return NextResponse.redirect(new URL("/verify-email/failed", origin));
  }

  try {
    const supabase = createAdminSupabase();

    // Find user by token
    const { data: user, error: selErr } = await supabase
      .from("users")
      .select("id, email_verified")
      .eq("verification_token", token)
      .maybeSingle();

    if (selErr) {
      console.error("verify-email: select error", selErr);
      return NextResponse.redirect(new URL("/verify-email/failed", origin));
    }

    if (!user) {
      console.warn("verify-email: token not found");
      return NextResponse.redirect(new URL("/verify-email/failed", origin));
    }

    // Update user: set email_verified timestamp, clear token
    const { error: updErr } = await supabase
      .from("users")
      .update({
        email_verified: new Date().toISOString(),
        verification_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updErr) {
      console.error("verify-email: update error", updErr);
      return NextResponse.redirect(new URL("/verify-email/failed", origin));
    }

    // success -> redirect to frontend success page
    return NextResponse.redirect(new URL("/verify-email/success", origin));
  } catch (err) {
    console.error("verify-email: unexpected error", err);
    return NextResponse.redirect(new URL("/verify-email/failed", (new URL(req.url)).origin));
  }
}

/**
 * Optional: POST handler (accepts JSON { token }) so other services can confirm programmatically.
 * Uncomment if you want POST support.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = (body?.token || "").toString();
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const supabase = createAdminSupabase();

    const { data: user, error: selErr } = await supabase
      .from("users")
      .select("id, email_verified")
      .eq("verification_token", token)
      .maybeSingle();

    if (selErr) {
      console.error("verify-email (POST): select error", selErr);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }
    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    const { error: updErr } = await supabase
      .from("users")
      .update({
        email_verified: new Date().toISOString(),
        verification_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updErr) {
      console.error("verify-email (POST): update error", updErr);
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("verify-email (POST): unexpected error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
