// src/app/api/user/upload-avatar/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "";

// Extend default NextAuth session typing
interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

type UploadBody = {
  fileName?: unknown;
  data?: unknown; // data URL
};

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function asString(u: unknown): string {
  return typeof u === "string" ? u : u === undefined || u === null ? "" : String(u);
}

export async function POST(req: NextRequest) {
  try {
    // Resolve user id from NextAuth session or fallback to our JWT cookie (session/app_token)
    let userId: string | undefined;
    try {
      const session = await getServerSession(authOptions);
      userId = (session?.user as SessionUser | undefined)?.id ?? undefined;
    } catch (e) {
      // ignore
    }

    // Fallback: parse cookie header and verify JWT token
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

    const body = (await req.json()) as UploadBody;
    const fileName = asString(body?.fileName);
    const dataUrl = asString(body?.data);

    if (!fileName || !dataUrl) {
      return NextResponse.json({ error: "Missing fileName or data" }, { status: 400 });
    }

    const match = /^data:(image\/[a-zA-Z+]+);base64,([0-9A-Za-z+/=]+)$/.exec(dataUrl);
    if (!match) {
      return NextResponse.json({ error: "Invalid data URL" }, { status: 400 });
    }

    const mime = match[1];
    const b64 = match[2];
    const ext = mime.split("/")[1] || "png";

    const sanitized = sanitizeFilename(fileName);
    const timestamp = Date.now();
    const filenameBase = `${userId}_${timestamp}_${sanitized}`.slice(0, 200);

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const finalName = filenameBase.toLowerCase().endsWith(`.${ext.toLowerCase()}`)
      ? filenameBase
      : `${filenameBase}.${ext}`;
    const outPath = path.join(uploadDir, finalName);

    const buffer = Buffer.from(b64, "base64");
    await fs.writeFile(outPath, buffer, "binary");

    const imageUrl = `/uploads/${finalName}`;

    // Persist image URL to the user's row in the database
    try {
      const supabase = createClient();
      await supabase
        .from("users")
        .update({ image: imageUrl, updated_at: new Date().toISOString() })
        .eq("id", userId);
    } catch (dbErr) {
      console.error("Failed to persist avatar URL:", dbErr);
      // We still return success for the upload itself, but log the DB failure.
    }

    return NextResponse.json({ success: true, imageUrl });
  } catch (err: unknown) {
    console.error("upload-avatar error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || "Upload failed" }, { status: 500 });
  }
}
