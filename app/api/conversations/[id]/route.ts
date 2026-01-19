// src/app/api/conversations/[id]/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = 'force-dynamic';

interface RouteParams {
    params: { id: string };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;

        if (!userId) {
            console.error("No user ID in session");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const conversationId = params.id;
        console.log(`Fetching conversation ${conversationId} for user ${userId}`);

        const supabase = createAdminClient();

        // Get conversation
        const { data: conversation, error: convError } = await supabase
            .from("conversations")
            .select("*")
            .eq("id", conversationId)
            .eq("user_id", userId)
            .single();

        if (convError) {
            console.error("Conversation query error:", convError);
            // Check if it's a PGRST116 error (no rows) - this is expected for non-existent conversations
            if (convError.code === 'PGRST116' || convError.message?.includes('No rows')) {
                console.log("Conversation doesn't exist in database yet");
                return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
            }
            // For other errors, return a more user-friendly message
            console.error("Database query error:", {
                code: (convError as any).code,
                message: (convError as any).message
            });
            return NextResponse.json(
                { error: "Failed to load conversation from database" },
                { status: 500 }
            );
        }

        if (!conversation) {
            console.log("Conversation not found for ID:", conversationId);
            return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
        }

        console.log("Conversation found:", conversation.id);
        console.log("Conversation user_id:", conversation.user_id, "Session user_id:", userId);
        console.log("Conversation data keys:", Object.keys(conversation));

        // Get messages from chat_messages table
        // Only filter by conversation_id - ownership is already verified via conversation query
        const { data: chatMessages, error: msgError } = await supabase
            .from("chat_messages")
            .select("*")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true });

        if (msgError) {
            console.error("Messages query error:", msgError);
        }

        console.log(`Loaded ${chatMessages?.length || 0} messages from chat_messages table for conversation ${conversationId}`);

        // Check for legacy messages stored in conversations.messages JSONB column
        let finalMessages = chatMessages || [];

        if (finalMessages.length === 0 && conversation.messages && Array.isArray(conversation.messages) && conversation.messages.length > 0) {
            console.log(`Found ${conversation.messages.length} legacy messages in conversation.messages column`);
            // Map legacy messages to expected format
            finalMessages = conversation.messages.map((msg: any, index: number) => ({
                id: msg.id || `legacy_msg_${index}`,
                conversation_id: conversationId,
                user_id: userId,
                type: msg.role === 'user' ? 'user' : (msg.role === 'assistant' ? 'assistant' : msg.type || 'user'),
                content: msg.content || '',
                created_at: msg.created_at || msg.timestamp || new Date().toISOString(),
            }));
        }

        console.log(`Returning ${finalMessages.length} total messages`);

        return NextResponse.json({
            conversation,
            messages: finalMessages
        });
    } catch (err: unknown) {
        console.error("Failed to fetch conversation:", err);
        const message = err instanceof Error ? err.message : String(err);
        console.error("Stack trace:", err instanceof Error ? err.stack : "No stack trace");
        return NextResponse.json(
            { error: message || "Failed to fetch conversation" },
            { status: 500 }
        );
    }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { title, pinned, archived, model } = body;

        const supabase = createAdminClient();
        const conversationId = params.id;

        const updateData: any = {
            updated_at: new Date().toISOString(),
        };

        if (title !== undefined) updateData.title = title;
        if (pinned !== undefined) updateData.pinned = pinned;
        if (archived !== undefined) updateData.archived = archived;
        if (model !== undefined) updateData.model = model;

        const { data, error } = await supabase
            .from("conversations")
            .update(updateData)
            .eq("id", conversationId)
            .eq("user_id", userId)
            .select()
            .single();

        if (error) throw error;
        if (!data) {
            return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
        }

        return NextResponse.json({ conversation: data });
    } catch (err: unknown) {
        console.error("Failed to update conversation:", err);
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: message || "Failed to update conversation" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = createAdminClient();
        const conversationId = params.id;

        // Delete conversation (messages will be deleted automatically due to CASCADE)
        const { error } = await supabase
            .from("conversations")
            .delete()
            .eq("id", conversationId)
            .eq("user_id", userId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        console.error("Failed to delete conversation:", err);
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: message || "Failed to delete conversation" }, { status: 500 });
    }
}
