// src/app/api/user/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { pool } from "@/lib/db";
import bcrypt from "bcrypt";

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Allowed updatable fields map: incoming key -> db column name
    const allowedFields: Record<string, string> = {
      name: "name",
      image: "image",
      country: "country",
      trading_style: "trading_style",
      trading_experience: "trading_experience",
      phone: "phone",
      phone_country_code: "phone_country_code",
    };

    const oldPassword = typeof body?.oldPassword === "string" ? body.oldPassword : undefined;
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : undefined;

    const parts: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [k, col] of Object.entries(allowedFields)) {
      if (Object.prototype.hasOwnProperty.call(body, k)) {
        const raw = body[k];
        const val = raw === "" ? null : raw;
        parts.push(`${col}=$${idx++}`);
        values.push(val);
      }
    }

    // Password change handling
    if (newPassword) {
      if (!oldPassword) {
        return NextResponse.json({ error: "Old password is required to change password" }, { status: 400 });
      }
      // fetch current hashed password
      const r = await pool.query(`SELECT password FROM users WHERE id=$1 LIMIT 1`, [userId]);
      const hashed = r.rows[0]?.password;
      if (!hashed) {
        return NextResponse.json({ error: "No existing password to verify against" }, { status: 400 });
      }
      const ok = await bcrypt.compare(oldPassword, hashed);
      if (!ok) {
        return NextResponse.json({ error: "Old password is incorrect" }, { status: 400 });
      }
      if (typeof newPassword !== "string" || newPassword.length < 8) {
        return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
      }
      const newHashed = await bcrypt.hash(newPassword, 10);
      parts.push(`password=$${idx++}`);
      values.push(newHashed);
    }

    if (parts.length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    // Build final query
    const q = `UPDATE users SET ${parts.join(", ")}, updated_at=NOW() WHERE id=$${idx}`;
    values.push(userId);

    try {
      await pool.query(q, values);
    } catch (err: any) {
      // If column missing, return helpful message suggesting migration
      if (err?.code === "42703") {
        return NextResponse.json(
          {
            error:
              `Database column missing (code 42703). Run migration to add missing columns (e.g. ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT;). DB error: ${err?.message}`,
          },
          { status: 500 }
        );
      }
      throw err;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("user update error:", err);
    return NextResponse.json({ error: err?.message || "Update failed" }, { status: 500 });
  }
}
