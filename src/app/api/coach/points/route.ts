// src/app/api/coach/points/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = createClient();
  const { data, error } = await supabase
    .from("users")
    .select("coach_points")
    .eq("id", session.user.id as string)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ points: Number(data?.coach_points || 0) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const op = (body?.op as string) || "add";
  const value = Number(body?.value || 0);
  if (!Number.isFinite(value)) return NextResponse.json({ error: "invalid_value" }, { status: 400 });
  const supabase = createClient();
  // fetch current
  const { data: userRow, error: selErr } = await supabase
    .from("users")
    .select("coach_points")
    .eq("id", session.user.id as string)
    .maybeSingle();
  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });
  const current = Number(userRow?.coach_points || 0);
  const next = op === "set" ? Math.max(0, value) : Math.max(0, current + value);
  const { error: updErr } = await supabase
    .from("users")
    .update({ coach_points: next })
    .eq("id", session.user.id as string);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  return NextResponse.json({ points: next });
}

