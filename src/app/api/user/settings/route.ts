// src/app/api/user/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { pool } from "@/lib/db";

type Body = {
  settings?: any;
};

export async function GET() {
  try {
    // session required
    const session = await getServerSession(authOptions as any);
    const userId = (session as any)?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const r = await pool.query(`SELECT settings FROM user_settings WHERE user_id=$1 LIMIT 1`, [userId]);
    if (!r.rows[0]) {
      return NextResponse.json({ success: true, settings: {} });
    }
    return NextResponse.json({ success: true, settings: r.rows[0].settings ?? {} });
  } catch (err: any) {
    console.error("GET /api/user/settings error:", err);
    return NextResponse.json({ error: err?.message || "Failed to load settings" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any);
    const userId = (session as any)?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as Body;
    if (!body?.settings) return NextResponse.json({ error: "No settings provided" }, { status: 400 });

    // We merge existing JSONB with provided settings using jsonb || new_jsonb
    // first ensure a row exists
    await pool.query(
      `INSERT INTO user_settings (user_id, settings, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, body.settings]
    );

    // Now merge
    await pool.query(
      `UPDATE user_settings
       SET settings = COALESCE(settings, '{}'::jsonb) || $2::jsonb, updated_at = NOW()
       WHERE user_id = $1`,
      [userId, body.settings]
    );

    const rr = await pool.query(`SELECT settings FROM user_settings WHERE user_id=$1 LIMIT 1`, [userId]);
    return NextResponse.json({ success: true, settings: rr.rows[0]?.settings ?? {} });
  } catch (err: any) {
    console.error("PATCH /api/user/settings error:", err);
    return NextResponse.json({ error: err?.message || "Failed to save settings" }, { status: 500 });
  }
}
