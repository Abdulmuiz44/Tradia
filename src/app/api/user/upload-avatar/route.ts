// app/api/user/upload-avatar/route.ts
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/utils/supabase/admin";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { fileName, data } = body as { fileName?: string; data?: string };

    if (!data || typeof data !== "string") {
      return NextResponse.json({ error: "Missing file data" }, { status: 400 });
    }

    // Auth: read JWT from session cookie (or app_token)
    const token = getCookieFromReq(req, "session") || getCookieFromReq(req, "app_token");
    if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    let payload: any = null;
    try {
      payload = jwt.verify(token, JWT_SECRET) as any;
    } catch (err) {
      console.error("upload-avatar: invalid JWT", (err as any)?.message ?? err);
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = payload?.id ?? payload?.sub;
    if (!userId) return NextResponse.json({ error: "Invalid session payload" }, { status: 401 });

    // data may be dataURL: data:[<mediatype>][;base64],<data>
    const m = data.match(/^data:(.+);base64,(.+)$/);
    let mime = "application/octet-stream";
    let base64 = data;
    if (m) {
      mime = m[1];
      base64 = m[2];
    } else {
      // If the client sent raw base64 without header, try to infer ext from filename
      // We'll keep mime as octet-stream (Supabase will accept but no content-type detection)
    }

    // file size check (1.5MB)
    const buffer = Buffer.from(base64, "base64");
    const maxBytes = Math.round(1.5 * 1024 * 1024);
    if (buffer.length > maxBytes) {
      return NextResponse.json({ error: "File too large (max 1.5MB)" }, { status: 413 });
    }

    const extFromMime = (() => {
      if (!mime) return "";
      if (mime === "image/jpeg") return ".jpg";
      if (mime === "image/png") return ".png";
      if (mime === "image/webp") return ".webp";
      if (mime === "image/gif") return ".gif";
      return "";
    })();

    const safeOriginal = (fileName || "avatar").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
    const filename = `${uuidv4()}_${Date.now()}_${safeOriginal}${extFromMime}`;

    const filePath = `${userId}/${filename}`; // folder per user

    const supabase = createAdminSupabase();

    // Upload to Supabase Storage (bucket: 'avatars') — make sure bucket exists and is public or set proper ACL.
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(filePath, buffer, {
        contentType: mime,
        upsert: true,
      });

    if (uploadErr) {
      console.error("Supabase storage upload error:", uploadErr);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // Get public URL (if bucket is public); otherwise use createSignedUrl for a private bucket
    const { data: publicData, error: publicErr } = supabase.storage.from("avatars").getPublicUrl(filePath);
    if (publicErr || !publicData?.publicUrl) {
      console.error("Failed to get public URL:", publicErr);
      return NextResponse.json({ error: "Failed to create public URL" }, { status: 500 });
    }
    const publicUrl = publicData.publicUrl as string;

    // Update user's image column
    const { error: updErr } = await supabase
      .from("users")
      .update({ image: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (updErr) {
      console.error("Failed to update user image:", updErr);
      // still return publicUrl so client can display, but surface server error
      return NextResponse.json({ imageUrl: publicUrl, warning: "User image update failed" });
    }

    return NextResponse.json({ imageUrl: publicUrl });
  } catch (err) {
    console.error("upload-avatar error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
