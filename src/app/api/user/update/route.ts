// src/app/api/user/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "";

// Extend default NextAuth session typing
interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

type UpdateBody = {
  name?: unknown;
  image?: unknown;
  oldPassword?: unknown;
  newPassword?: unknown;
  phone?: unknown;
  country?: unknown;
  tradingStyle?: unknown;
  tradingExperience?: unknown;
  bio?: unknown;
};

function asStringOrUndefined(u: unknown): string | undefined {
  if (typeof u === "string") {
    const s = u.trim();
    return s.length ? s : undefined;
  }
  return undefined;
}

export async function PATCH(req: NextRequest) {
  try {
    // Resolve user id from NextAuth session or fallback to our JWT cookie (session/app_token)
    let userId: string | undefined;
    try {
      const session = await getServerSession(authOptions);
      userId = (session?.user as SessionUser | undefined)?.id ?? undefined;
    } catch (e) {
      // ignore
    }

    if (!userId) {
      const cookieHeader = req.headers.get("cookie") || "";
      const m = cookieHeader.match(/(?:^|; *)?(?:session|app_token)=([^;]+)/);
      const token = m ? decodeURIComponent(m[1]) : null;
      if (token && JWT_SECRET) {
        try {
          const payload = jwt.verify(token, JWT_SECRET) as any;
          if (payload && payload.sub) userId = String(payload.sub);
        } catch (e) {
          console.error("JWT verify failed:", e);
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

  const body = (await req.json()) as UpdateBody;
    const name = asStringOrUndefined(body?.name);
    const image = asStringOrUndefined(body?.image);
    const oldPassword =
      typeof body?.oldPassword === "string" ? body.oldPassword : undefined;
    const newPassword =
      typeof body?.newPassword === "string" ? body.newPassword : undefined;
  const phone = asStringOrUndefined(body?.phone);
  const country = asStringOrUndefined(body?.country);
  const tradingStyle = asStringOrUndefined(body?.tradingStyle);
  const tradingExperience = asStringOrUndefined(body?.tradingExperience);
  const bio = asStringOrUndefined(body?.bio);

    if (!name && !image && !newPassword) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    // If changing password — verify old password first
    if (newPassword) {
      if (!oldPassword) {
        return NextResponse.json(
          { error: "Old password is required to change password" },
          { status: 400 }
        );
      }

      const supabase = createClient();
      const { data: pwRow, error: pwErr } = await supabase
        .from("users")
        .select("password")
        .eq("id", userId)
        .maybeSingle();
      if (pwErr) throw pwErr;

      const hashed = (pwRow as any)?.password;
      if (!hashed) {
        return NextResponse.json(
          { error: "No existing password set; cannot change" },
          { status: 400 }
        );
      }

      const ok = await bcrypt.compare(oldPassword, hashed);
      if (!ok) {
        return NextResponse.json(
          { error: "Old password is incorrect" },
          { status: 400 }
        );
      }

      const newHashed = await bcrypt.hash(newPassword, 10);

  const updateRow: Record<string, unknown> = {};
  if (name) updateRow["name"] = name;
  if (image) updateRow["image"] = image;
  if (phone) updateRow["phone"] = phone;
  if (country) updateRow["country"] = country;
  if (tradingStyle) updateRow["trading_style"] = tradingStyle;
  if (tradingExperience) updateRow["trading_experience"] = tradingExperience;
  if (bio) updateRow["bio"] = bio;
  updateRow["password"] = newHashed;
  updateRow["updated_at"] = new Date().toISOString();
  const { data: updatedUser } = await supabase.from("users").update(updateRow).eq("id", userId).select("id,name,email,image,phone,country,trading_style,trading_experience,bio,updated_at").maybeSingle();

      return NextResponse.json({ success: true });
    }

    // Update name/image only
    const fieldsToUpdate: Record<string, unknown> = {};
    if (name) fieldsToUpdate["name"] = name;
    if (image) fieldsToUpdate["image"] = image;
    if (phone) fieldsToUpdate["phone"] = phone;
    if (country) fieldsToUpdate["country"] = country;
    if (tradingStyle) fieldsToUpdate["trading_style"] = tradingStyle;
    if (tradingExperience) fieldsToUpdate["trading_experience"] = tradingExperience;
    if (bio) fieldsToUpdate["bio"] = bio;

    if (Object.keys(fieldsToUpdate).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    fieldsToUpdate["updated_at"] = new Date().toISOString();

    const { data: updatedUser, error: updErr } = await createClient()
      .from("users")
      .update(fieldsToUpdate)
      .eq("id", userId)
      .select("id,name,email,image,phone,country,trading_style,trading_experience,bio,updated_at");

    if (updErr) throw updErr;

    // return updated user object
    const user = Array.isArray(updatedUser) ? updatedUser[0] : updatedUser;
    return NextResponse.json({ success: true, user });
  } catch (err: unknown) {
    console.error("user update error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || "Update failed" }, { status: 500 });
  }
}
