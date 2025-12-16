// src/app/api/auth/change-password/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current password and new password are required" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters long" }, { status: 400 });
    }

    const supabase = createClient();

    // Get current user with password
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("password")
      .eq("id", session.user.id)
      .single();

    if (fetchError || !user) {
      console.error("Failed to fetch user:", fetchError);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify current password
    if (!user.password) {
      return NextResponse.json({ error: "Account password not set. Please contact support." }, { status: 400 });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    const { error: updateError } = await supabase
      .from("users")
      .update({
        password: hashedNewPassword,
        updated_at: new Date().toISOString()
      })
      .eq("id", session.user.id);

    if (updateError) {
      console.error("Failed to update password:", updateError);
      return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Password updated successfully"
    });
  } catch (error) {
    console.error("Password change error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}