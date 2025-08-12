// app/api/user/upload-avatar/route.ts
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fileName, data } = body as { fileName?: string; data?: string };

    if (!data || typeof data !== "string") {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    // data should be like: data:image/png;base64,<base64>
    const m = data.match(/^data:(.+);base64,(.+)$/);
    if (!m) {
      return NextResponse.json({ error: "Invalid data URL" }, { status: 400 });
    }
    const mime = m[1]; // e.g. image/png
    const b64 = m[2];
    const ext = mime.split("/")[1] ?? "png";

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const filename = `${uuidv4()}.${ext}`;
    const filepath = path.join(uploadsDir, filename);
    const buffer = Buffer.from(b64, "base64");
    fs.writeFileSync(filepath, buffer);

    // Served from /uploads/<filename>
    const imageUrl = `/uploads/${filename}`;
    return NextResponse.json({ imageUrl });
  } catch (err) {
    console.error("upload-avatar error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
