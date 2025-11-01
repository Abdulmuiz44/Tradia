// src/app/api/broker/preference/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";

// Only Pro and above can set/view broker preference
const PRO_PLANS = new Set(["pro", "plus", "elite"]);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();
    const { data: user, error: uerr } = await supabase
      .from("users")
      .select("id, plan")
      .eq("id", session.user.id)
      .single();
    if (uerr || !user) {
      return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    }

    if (!PRO_PLANS.has(String(user.plan || "").toLowerCase())) {
      return NextResponse.json({ error: "UPGRADE_REQUIRED", message: "Broker preference is available for Pro plan and above." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("user_broker_preferences")
      .select("broker, platform, is_favorite")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;

    return NextResponse.json({ preference: data || null });
  } catch (err) {
    console.error("broker/preference GET error:", err);
    return NextResponse.json({ preference: null });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const broker = String(body?.broker || "").trim();
    const platform = String(body?.platform || "").trim();
    const isFavorite = body?.is_favorite === false ? false : true;

    if (!broker || !platform) {
      return NextResponse.json({ error: "INVALID_INPUT", message: "broker and platform are required" }, { status: 400 });
    }

    const supabase = createClient();
    const { data: user, error: uerr } = await supabase
      .from("users")
      .select("id, plan")
      .eq("id", session.user.id)
      .single();
    if (uerr || !user) {
      return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    }

    if (!PRO_PLANS.has(String(user.plan || "").toLowerCase())) {
      return NextResponse.json({ error: "UPGRADE_REQUIRED", message: "Broker preference is available for Pro plan and above." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("user_broker_preferences")
      .upsert({ user_id: user.id, broker, platform, is_favorite: isFavorite }, { onConflict: "user_id" })
      .select("broker, platform, is_favorite")
      .single();
    if (error) throw error;

    return NextResponse.json({ preference: data });
  } catch (err) {
    console.error("broker/preference POST error:", err);
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}

