// src/app/api/conversations/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get conversations for user
    const { data: conversations, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .eq("archived", false)
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ conversations: conversations || [] });
  } catch (err: unknown) {
    console.error("Failed to fetch conversations:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message || "Failed to fetch conversations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title = "New Conversation", model = "gpt-4o-mini" } = body;

    const supabase = createAdminClient();
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        id: conversationId,
        user_id: userId,
        title,
        model,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ conversation: data });
  } catch (err: unknown) {
    console.error("Failed to create conversation:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message || "Failed to create conversation" }, { status: 500 });
  }
}
