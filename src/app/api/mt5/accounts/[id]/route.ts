// src/app/api/mt5/accounts/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const accountId = resolvedParams.id;
    if (!accountId) {
      return NextResponse.json({ error: "Account ID required" }, { status: 400 });
    }

    const supabase = createClient();

    // Get specific MT5 account
    const { data: account, error } = await supabase
      .from("mt5_accounts")
      .select("*")
      .eq("id", accountId)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ account });
  } catch (err) {
    console.error("Failed to get MT5 account:", err);
    const message = err instanceof Error ? err.message : "Failed to get account";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const accountId = resolvedParams.id;
    if (!accountId) {
      return NextResponse.json({ error: "Account ID required" }, { status: 400 });
    }

    const body = await req.json();
    const supabase = createClient();

    // Update MT5 account
    const { data, error } = await supabase
      .from("mt5_accounts")
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq("id", accountId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ account: data });
  } catch (err) {
    console.error("Failed to update MT5 account:", err);
    const message = err instanceof Error ? err.message : "Failed to update account";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const accountId = resolvedParams.id;
    if (!accountId) {
      return NextResponse.json({ error: "Account ID required" }, { status: 400 });
    }

    const supabase = createClient();

    // Delete MT5 account
    const { error } = await supabase
      .from("mt5_accounts")
      .delete()
      .eq("id", accountId)
      .eq("user_id", userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete MT5 account:", err);
    const message = err instanceof Error ? err.message : "Failed to delete account";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}