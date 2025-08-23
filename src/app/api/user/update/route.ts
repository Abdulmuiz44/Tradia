// app/api/user/update/route.ts
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/utils/supabase/admin";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) console.warn("JWT_SECRET not set");

function getCookieFromReq(req: Request, name: string) {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookie = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  if (!cookie) return null;
  return decodeURIComponent(cookie.split("=")[1]);
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      name,
      image,
      phone,
      country,
      tradingStyle,
      tradingExperience,
      bio,
      oldPassword,
      newPassword,
    } = body as Record<string, unknown>;

    const token = getCookieFromReq(req, "session") || getCookieFromReq(req, "app_token");
    if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    let payload: any = null;
    try {
      payload = jwt.verify(token, JWT_SECRET) as any;
    } catch (err) {
      console.error("update profile: invalid JWT", (err as any)?.message ?? err);
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = payload?.id ?? payload?.sub;
    if (!userId) return NextResponse.json({ error: "Invalid session payload" }, { status: 401 });

    const supabase = createAdminSupabase();

    // Fetch user current (to validate old password if needed)
    const { data: currentUser, error: fetchErr } = await supabase
      .from("users")
      .select("id, password, name, email, image")
      .eq("id", userId)
      .maybeSingle();

    if (fetchErr) {
      console.error("profile update: fetch user error", fetchErr);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
    if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // If changing password: validate old -> set new
    let hashedPasswordToSet: string | undefined = undefined;
    if (oldPassword || newPassword) {
      if (!oldPassword || !newPassword) {
        return NextResponse.json({ error: "Old and new password required to change password" }, { status: 400 });
      }
      const ok = await bcrypt.compare(String(oldPassword), String(currentUser.password));
      if (!ok) return NextResponse.json({ error: "Current password incorrect" }, { status: 403 });
      if (String(newPassword).length < 8) return NextResponse.json({ error: "New password too short" }, { status: 400 });
      hashedPasswordToSet = bcrypt.hashSync(String(newPassword), 10);
    }

    // Build update object (map client keys to DB columns)
    const updates: Record<string, any> = {};
    if (typeof name === "string") updates.name = name.trim() || null;
    if (typeof image === "string") updates.image = image || null;
    if (typeof phone === "string") updates.phone = phone || null;
    if (typeof country === "string") updates.country = country || null;
    if (typeof tradingStyle === "string") updates.trading_style = tradingStyle || null;
    if (typeof tradingExperience === "string") updates.trading_experience = tradingExperience || null;
    if (typeof bio === "string") updates.bio = bio || null;
    if (hashedPasswordToSet) updates.password = hashedPasswordToSet;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: true, user: currentUser });
    }

    updates.updated_at = new Date().toISOString();

    const { data: updated, error: updErr } = await supabase
      .from("users")
      .update(updates)
      .eq("id", userId)
      .select("id, email, name, image, country, phone, trading_style, trading_experience, bio")
      .maybeSingle();

    if (updErr) {
      console.error("profile update: update error", updErr);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: updated });
  } catch (err) {
    console.error("profile update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
