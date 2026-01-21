// src/app/api/user/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";

export const dynamic = 'force-dynamic';

interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

type SettingsBody = { settings?: unknown };

export async function GET() {
  try {
    let userId: string | undefined;
    try {
      const session = await getServerSession(authOptions);
      userId = (session?.user as SessionUser | undefined)?.id ?? undefined;
    } catch (e) { }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();
    const { data: row, error: rowErr } = await supabase
      .from("users")
      .select("metadata")
      .eq("id", userId)
      .maybeSingle();

    if (rowErr) throw rowErr;

    // settings are stored inside metadata.settings
    const settings = row?.metadata?.settings || {};
    return NextResponse.json({ success: true, settings });
  } catch (err: unknown) {
    console.error("GET /api/user/settings error:", err);
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    let userId: string | undefined;
    try {
      const session = await getServerSession(authOptions);
      userId = (session?.user as SessionUser | undefined)?.id ?? undefined;
    } catch (e) { }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as SettingsBody;
    if (!body?.settings) {
      return NextResponse.json({ error: "No settings provided" }, { status: 400 });
    }

    const supabase = createClient();

    // Fetch current metadata
    const { data: row, error: fetchErr } = await supabase
      .from("users")
      .select("metadata")
      .eq("id", userId)
      .single();

    if (fetchErr) throw fetchErr;

    const currentMeta = row?.metadata || {};
    const newSettings = { ...currentMeta.settings, ...(body.settings as object) };
    const newMeta = { ...currentMeta, settings: newSettings };

    const { error: updateErr } = await supabase
      .from("users")
      .update({ metadata: newMeta, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true, settings: newSettings });
  } catch (err: unknown) {
    console.error("PATCH /api/user/settings error:", err);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
