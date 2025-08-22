// src/app/api/user/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";

// Extend default NextAuth session typing
interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

type SettingsBody = { settings?: unknown };

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    const userId =
      (session?.user as SessionUser | undefined)?.id ?? "";

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createClient();
    const { data: row, error: rowErr } = await supabase
      .from("user_settings")
      .select("settings")
      .eq("user_id", userId)
      .maybeSingle();
    if (rowErr) throw rowErr;
    if (!row) return NextResponse.json({ success: true, settings: {} });
    return NextResponse.json({ success: true, settings: row.settings ?? {} });
  } catch (err: unknown) {
    console.error("GET /api/user/settings error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: msg || "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const userId =
      (session?.user as SessionUser | undefined)?.id ?? "";

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = (await req.json()) as SettingsBody;

    if (!body?.settings) {
      return NextResponse.json(
        { error: "No settings provided" },
        { status: 400 }
      );
    }

    // Ensure row exists
    const supabase = createClient();
    // Ensure row exists (insert if not)
    const { error: insErr } = await supabase.from("user_settings").upsert(
      { user_id: userId, settings: body.settings, updated_at: new Date().toISOString() },
      { onConflict: ["user_id"] }
    );
    if (insErr) throw insErr;

    // Merge via a select + update (Supabase doesn't support jsonb concat in client API)
    const { data: existing, error: exErr } = await supabase
      .from("user_settings")
      .select("settings")
      .eq("user_id", userId)
      .maybeSingle();
    if (exErr) throw exErr;
    const merged = Object.assign({}, existing?.settings ?? {}, body.settings);
    await supabase.from("user_settings").update({ settings: merged, updated_at: new Date().toISOString() }).eq("user_id", userId);

    const { data: final, error: finalErr } = await supabase
      .from("user_settings")
      .select("settings")
      .eq("user_id", userId)
      .maybeSingle();
    if (finalErr) throw finalErr;
    return NextResponse.json({ success: true, settings: final?.settings ?? {} });
  } catch (err: unknown) {
    console.error("PATCH /api/user/settings error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: msg || "Failed to save settings" },
      { status: 500 }
    );
  }
}
