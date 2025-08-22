// app/api/auth/reset-password/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { createClient } from "@/utils/supabase/server";

type ResetRequestBody = { token?: unknown; password?: unknown };

function asString(v: unknown): string {
  return typeof v === "string" ? v : v === undefined || v === null ? "" : String(v);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ResetRequestBody;
    const token = asString(body?.token).trim();
    const password = asString(body?.password);

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required." }, { status: 400 });
    }

    // lookup token
    const supabase = createClient();
    const { data: row, error: terr } = await supabase
      .from("password_reset_tokens")
      .select("token, user_id, expires_at")
      .eq("token", token)
      .maybeSingle();
    if (terr) throw terr;
    if (!row) {
      return NextResponse.json({ error: "Invalid or expired token." }, { status: 400 });
    }

    const expiresAt = new Date(row.expires_at);
    if (isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
      // cleanup expired token
  await supabase.from("password_reset_tokens").delete().eq("token", token);
      return NextResponse.json({ error: "Invalid or expired token." }, { status: 400 });
    }

    // hash and update password
    const hashed = await bcrypt.hash(password, 12);
  await supabase.from("users").update({ password: hashed, updated_at: new Date().toISOString() }).eq("id", row.user_id);

  // delete token
  await supabase.from("password_reset_tokens").delete().eq("token", token);

    return NextResponse.json({ message: "Password reset successful. You may now sign in." });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Reset password error:", msg);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
