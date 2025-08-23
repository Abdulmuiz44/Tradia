import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin"; // service-role client

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

  // 1) find user by token
  const { data: user, error: findErr } = await supabase
    .from("users")
    .select("id, email_verified")
    .eq("verification_token", token)
    .maybeSingle();

  if (findErr || !user) {
    failUrl.searchParams.set("reason", "invalid_or_used_token");
    return NextResponse.redirect(failUrl);
  }

  // if already verified, just succeed
  if (user.email_verified) {
    return NextResponse.redirect(successUrl);
  }

  // 2) mark verified + clear token
  const { error: updErr } = await supabase
    .from("users")
    .update({
      email_verified: new Date().toISOString(),
      verification_token: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updErr) {
    failUrl.searchParams.set("reason", "update_failed");
    return NextResponse.redirect(failUrl);
  }

  return NextResponse.redirect(successUrl);
}
