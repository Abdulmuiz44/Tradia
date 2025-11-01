// src/app/api/marketing/leads/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const source = String(body?.source || "lead");
    if (!email) return NextResponse.json({ error: "EMAIL_REQUIRED" }, { status: 400 });

    const supabase = createClient();
    await supabase.from("payment_logs").insert({
      user_id: null,
      source: "lead",
      level: "info",
      message: `marketing_lead:${source}`,
      context: { email },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("leads route error:", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

