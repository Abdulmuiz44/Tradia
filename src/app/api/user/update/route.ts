// src/app/api/user/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { pool } from "@/lib/db";
import bcrypt from "bcrypt";

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
    const session = await getServerSession(authOptions);

    const userId =
      (session?.user as SessionUser | undefined)?.id ?? undefined;

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

      const r = await pool.query<{ password: string }>(
        `SELECT password FROM users WHERE id=$1 LIMIT 1`,
        [userId]
      );

      const hashed = r.rows[0]?.password;
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

      const parts: string[] = [];
      const params: unknown[] = [];
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

      return NextResponse.json({ success: true });
    }

    // Update name/image only
    const fields: string[] = [];
    const values: unknown[] = [];
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

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("user update error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || "Update failed" }, { status: 500 });
  }
}
