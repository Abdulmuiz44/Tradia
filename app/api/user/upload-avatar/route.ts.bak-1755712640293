// src/app/api/user/upload-avatar/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

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
    const session = await getServerSession(authOptions);
    const userId = typeof session?.user?.id === "string" ? session.user.id : undefined;
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

    const finalName = filenameBase.toLowerCase().endsWith(`.${ext.toLowerCase()}`) ? filenameBase : `${filenameBase}.${ext}`;
    const outPath = path.join(uploadDir, finalName);

    const buffer = Buffer.from(b64, "base64");
    await fs.writeFile(outPath, buffer, "binary");

    const imageUrl = `/uploads/${finalName}`;

    return NextResponse.json({ success: true, imageUrl });
  } catch (err: unknown) {
    console.error("upload-avatar error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || "Upload failed" }, { status: 500 });
  }
}
