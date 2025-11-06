// src/app/api/marketing/subscribe/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const source = String(body?.source || "newsletter_footer");
    if (!email) return NextResponse.json({ error: "EMAIL_REQUIRED" }, { status: 400 });

    const supabase = createClient();
    await supabase.from("payment_logs").insert({
      user_id: null,
      source: "newsletter",
      level: "info",
      message: `subscribe:${source}`,
      context: { email },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("subscribe route error:", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

