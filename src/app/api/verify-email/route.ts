import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  const successUrl = new URL("/verify-email/success", url);
  const failUrl = new URL("/verify-email/failed", url);

  if (!token) {
    failUrl.searchParams.set("reason", "missing_token");
    return NextResponse.redirect(failUrl);
  }

  const supabase = createAdminClient();

  // Call SQL function
  const { error: fnError } = await supabase.rpc("verify_email", { p_token: token });
  if (fnError) {
    console.error("verify_email error:", fnError);
    failUrl.searchParams.set("reason", "verify_failed");
    return NextResponse.redirect(failUrl);
  }

  // Get updated user
  const { data: user, error: userErr } = await supabase
    .from("users")
    .select("id, email, email_verified")
    .eq("id", supabase.auth.admin.getUserById) // if you know user_id
    .maybeSingle();

  if (userErr || !user) {
    failUrl.searchParams.set("reason", "user_not_found");
    return NextResponse.redirect(failUrl);
  }

  // ✅ Re-issue JWT with updated email_verified
  const newToken = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      email_verified: !!user.email_verified,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  const res = NextResponse.redirect(successUrl);
  res.cookies.set("app_token", newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return res;
}
