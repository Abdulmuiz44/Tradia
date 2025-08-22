// src/app/api/user/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { pool } from "@/lib/db";

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

    const r = await pool.query<{ settings: unknown }>(
      `SELECT settings FROM user_settings WHERE user_id=$1 LIMIT 1`,
      [userId]
    );

    if (!r.rows[0]) {
      return NextResponse.json({ success: true, settings: {} });
    }

    return NextResponse.json({
      success: true,
      settings: r.rows[0].settings ?? {},
    });
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
    await pool.query(
      `INSERT INTO user_settings (user_id, settings, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, body.settings]
    );

    // Merge provided settings into existing JSONB
    await pool.query(
      `UPDATE user_settings
       SET settings = COALESCE(settings, '{}'::jsonb) || $2::jsonb,
           updated_at = NOW()
       WHERE user_id = $1`,
      [userId, body.settings]
    );

    const rr = await pool.query<{ settings: unknown }>(
      `SELECT settings FROM user_settings WHERE user_id=$1 LIMIT 1`,
      [userId]
    );

    return NextResponse.json({
      success: true,
      settings: rr.rows[0]?.settings ?? {},
    });
  } catch (err: unknown) {
    console.error("PATCH /api/user/settings error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: msg || "Failed to save settings" },
      { status: 500 }
    );
  }
}
