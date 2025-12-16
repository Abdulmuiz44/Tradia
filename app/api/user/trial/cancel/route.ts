// src/app/api/user/trial/cancel/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const supabase = createClient();
    const { data: user, error } = await supabase
      .from("users")
      .select("id, is_grandfathered, plan")
      .eq("email", email)
      .maybeSingle();

    if (error || !user) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });

    const isPaid = ["pro", "plus", "elite"].includes(String(user.plan || "free").toLowerCase());
    if (isPaid || user.is_grandfathered) return NextResponse.json({ ok: true, info: { reason: "ALREADY_PAID_OR_GF" } });

    const now = new Date().toISOString();
    const { error: updErr } = await supabase
      .from("users")
      .update({ trial_ends_at: now })
      .eq("id", user.id);
    if (updErr) {
      return NextResponse.json({ error: "FAILED_TO_CANCEL", details: updErr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, cancelledAt: now });
  } catch (err) {
    console.error("trial/cancel error:", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

