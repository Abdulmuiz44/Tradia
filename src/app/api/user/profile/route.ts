// app/api/user/profile/route.ts
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/utils/supabase/admin";
import jwt from "jsonwebtoken";

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

export async function GET(req: Request) {
  try {
    const token = getCookieFromReq(req, "session") || getCookieFromReq(req, "app_token");
    if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    let payload: any = null;
    try {
      payload = jwt.verify(token, JWT_SECRET) as any;
    } catch (err) {
      console.error("profile GET: invalid JWT", (err as any)?.message ?? err);
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = payload?.id ?? payload?.sub;
    if (!userId) return NextResponse.json({ error: "Invalid session payload" }, { status: 401 });

    const supabase = createAdminSupabase();

    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, name, image, country, phone, trading_style, trading_experience, bio")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("profile GET DB error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json(user);
  } catch (err) {
    console.error("profile GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
