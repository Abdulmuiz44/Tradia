// src/app/api/user/upload-avatar/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

type Body = {
  fileName: string;
  data: string; // data URL (data:image/png;base64,...)
};

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Body;
    if (!body?.fileName || !body?.data) {
      return NextResponse.json({ error: "Missing fileName or data" }, { status: 400 });
    }

    // Parse data URL
    const match = /^data:(image\/[a-zA-Z+]+);base64,([0-9A-Za-z+/=]+)$/.exec(body.data);
    if (!match) {
      return NextResponse.json({ error: "Invalid data URL" }, { status: 400 });
    }
    const mime = match[1];
    const b64 = match[2];
    const ext = mime.split("/")[1] || "png";

    const sanitized = sanitizeFilename(body.fileName);
    const timestamp = Date.now();
    const filename = `${session.user.id}_${timestamp}_${sanitized}`.slice(0, 200);
    const uploadDir = path.join(process.cwd(), "public", "uploads");

    // ensure upload dir
    await fs.mkdir(uploadDir, { recursive: true });

    const finalName = filename.endsWith(ext) ? filename : `${filename}.${ext}`;
    const outPath = path.join(uploadDir, finalName);

    const buffer = Buffer.from(b64, "base64");
    await fs.writeFile(outPath, buffer, "binary");

    // Return URL that the client can use; no DB changes
    const imageUrl = `/uploads/${finalName}`;

    return NextResponse.json({ success: true, imageUrl });
  } catch (err: any) {
    console.error("upload-avatar error:", err);
    return NextResponse.json({ error: err?.message || "Upload failed" }, { status: 500 });
  }
}
