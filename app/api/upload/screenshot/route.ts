import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

// Use service role for storage operations since we use NextAuth
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

/**
 * POST /api/upload/screenshot
 * Upload a trade screenshot to Supabase Storage
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const type = formData.get('type') as string; // 'before' or 'after'

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed." },
                { status: 400 }
            );
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json(
                { error: "File too large. Maximum size is 5MB." },
                { status: 400 }
            );
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 9);
        const fileName = `${session.user.id}/${timestamp}_${randomId}_${type}.${fileExt}`;

        // Convert File to Buffer for upload
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Supabase Storage using service role
        const { data, error } = await supabaseAdmin.storage
            .from('trade-screenshots')
            .upload(fileName, buffer, {
                contentType: file.type,
                cacheControl: '3600',
                upsert: false,
            });

        if (error) {
            console.error('Screenshot upload error:', error);
            return NextResponse.json(
                { error: `Failed to upload: ${error.message}` },
                { status: 500 }
            );
        }

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
            .from('trade-screenshots')
            .getPublicUrl(data.path);

        return NextResponse.json({
            url: urlData.publicUrl,
            path: data.path
        });
    } catch (error) {
        console.error("Upload API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
