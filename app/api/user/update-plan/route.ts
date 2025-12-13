import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { plan } = body;

    if (!plan) {
      return NextResponse.json({ error: "Plan is required" }, { status: 400 });
    }

    const supabase = createClient();

    // Update user plan in database
    const { error } = await supabase
      .from("users")
      .update({ plan })
      .eq("id", session.user.id as string);

    if (error) {
      console.error("Failed to update plan:", error);
      return NextResponse.json(
        { error: "Failed to update plan" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    console.error("Plan update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
