// src/app/api/user/upload-avatar/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed." }, { status: 400 });
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large. Maximum size is 5MB." }, { status: 400 });
    }

    const supabase = createClient();

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `avatar_${session.user.id}_${Date.now()}.${fileExt}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error("Failed to upload avatar:", uploadError);
      return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    // Update user profile with new avatar URL
    const { error: updateError } = await supabase
      .from("users")
      .update({
        image: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq("id", session.user.id);

    if (updateError) {
      console.error("Failed to update user avatar:", updateError);
      // Try to delete the uploaded file if update failed
      await supabase.storage
        .from('avatars')
        .remove([fileName]);

      return NextResponse.json({ error: "Failed to update avatar" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      avatarUrl: publicUrl,
      message: "Avatar uploaded successfully"
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
