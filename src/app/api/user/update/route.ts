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
    const name = typeof body?.name === "string" ? body.name.trim() : undefined;
    const image = typeof body?.image === "string" ? body.image.trim() : undefined;
    const oldPassword = typeof body?.oldPassword === "string" ? body.oldPassword : undefined;
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : undefined;

    // Validate
    if (!name && !image && !newPassword) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    // If password change requested, validate old password
    if (newPassword) {
      if (!oldPassword) {
        return NextResponse.json({ error: "Old password is required to change password" }, { status: 400 });
      }
      // Fetch existing hashed password
      const r = await pool.query(`SELECT password FROM users WHERE id=$1 LIMIT 1`, [userId]);
      const hashed = r.rows[0]?.password;
      if (!hashed) {
        return NextResponse.json({ error: "No existing password set; cannot change" }, { status: 400 });
      }
      const ok = await bcrypt.compare(oldPassword, hashed);
      if (!ok) {
        return NextResponse.json({ error: "Old password is incorrect" }, { status: 400 });
      }
      // Hash new password
      const saltRounds = 10;
      const newHashed = await bcrypt.hash(newPassword, saltRounds);
      // Update password along with name/image if provided
      const parts: string[] = [];
      const params: any[] = [];
      let idx = 1;

      if (name) {
        parts.push(`name=$${idx++}`);
        params.push(name);
      }
      if (image) {
        parts.push(`image=$${idx++}`);
        params.push(image);
      }
      parts.push(`password=$${idx++}`);
      params.push(newHashed);

      params.push(userId);
      const query = `UPDATE users SET ${parts.join(", ")}, updated_at=NOW() WHERE id=$${idx}`;
      await pool.query(query, params);

      // return updated user
      const ures = await pool.query(`SELECT id, name, email, image, role FROM users WHERE id=$1 LIMIT 1`, [userId]);
      return NextResponse.json({ success: true, user: ures.rows[0] });
    }

    // No password change: update name/image only
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;
    if (name) {
      fields.push(`name=$${i++}`);
      values.push(name);
    }
    if (image) {
      fields.push(`image=$${i++}`);
      values.push(image);
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    values.push(userId);
    const q = `UPDATE users SET ${fields.join(", ")}, updated_at=NOW() WHERE id=$${i}`;
    await pool.query(q, values);

    const ures = await pool.query(`SELECT id, name, email, image, role FROM users WHERE id=$1 LIMIT 1`, [userId]);
    return NextResponse.json({ success: true, user: ures.rows[0] });
  } catch (err: any) {
    console.error("user update error:", err);
    return NextResponse.json({ error: err?.message || "Update failed" }, { status: 500 });
  }
}
