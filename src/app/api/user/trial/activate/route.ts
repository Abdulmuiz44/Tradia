// src/app/api/user/trial/activate/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const supabase = createClient();
    const { data: user, error } = await supabase
      .from("users")
      .select("id, plan, is_grandfathered, trial_ends_at")
      .eq("email", email)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    }

    const isPaid = ["pro", "plus", "elite"].includes(String(user.plan || "free").toLowerCase());
    if (isPaid || user.is_grandfathered) {
      return NextResponse.json({ ok: true, info: { reason: "ALREADY_PAID_OR_GF" } });
    }

    const now = Date.now();
    const existingEnd = user.trial_ends_at ? new Date(user.trial_ends_at).getTime() : 0;
    const stillActive = existingEnd > now;

    // If no trial or expired, (re)start 30-day trial
    if (!stillActive) {
      const newEnd = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { error: updErr } = await supabase
        .from("users")
        .update({ trial_ends_at: newEnd, signup_at: new Date().toISOString() })
        .eq("id", user.id);
      if (updErr) {
        return NextResponse.json({ error: "FAILED_TO_START_TRIAL", details: updErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, trialEndsAt: newEnd });
    }

    return NextResponse.json({ ok: true, trialEndsAt: user.trial_ends_at });
  } catch (err) {
    console.error("trial/activate error:", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
