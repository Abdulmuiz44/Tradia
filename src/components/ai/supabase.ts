import { createClient } from '@supabase/supabase-js';
import { Message } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Chat messages table operations
export const chatMessagesApi = {
  // Save message
  async saveMessage(userId: string, message: Message): Promise<void> {
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        user_id: userId,
        id: message.id,
        type: message.type,
        content: message.content,
        timestamp: message.timestamp.toISOString(),
        mode: message.mode,
        variant: message.variant,
      });

    if (error) throw error;
  },

  // Load messages for user
  async loadMessages(userId: string, daysBack?: number): Promise<Message[]> {
    let query = supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: true });

    // If daysBack is provided and not -1, limit by date
    if (daysBack && daysBack !== -1) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      query = query.gte('timestamp', startDate.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.map(row => ({
      id: row.id,
      type: row.type,
      content: row.content,
      timestamp: new Date(row.timestamp),
      mode: row.mode,
      variant: row.variant,
    }));
  },

  // Delete message
  async deleteMessage(userId: string, messageId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', userId)
      .eq('id', messageId);

    if (error) throw error;
  },

  // Update message (for edits)
  async updateMessage(userId: string, messageId: string, content: string): Promise<void> {
    const { error } = await supabase
      .from('chat_messages')
      .update({ content })
      .eq('user_id', userId)
      .eq('id', messageId);

    if (error) throw error;
  },

  // Get usage stats
  async getUsageStats(userId: string, date: string): Promise<{ messages: number; uploads: number }> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: messages, error: msgError } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .gte('timestamp', startOfDay.toISOString())
        .lte('timestamp', endOfDay.toISOString());

      if (msgError) {
        console.error('Error fetching message stats:', msgError);
        throw new Error(`Failed to fetch message stats: ${msgError.message}`);
      }

      // Assuming uploads are stored in a separate table
      const { data: uploads, error: uploadError } = await supabase
        .from('file_uploads')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .gte('uploaded_at', startOfDay.toISOString())
        .lte('uploaded_at', endOfDay.toISOString());

      if (uploadError) {
        console.error('Error fetching upload stats:', uploadError);
        throw new Error(`Failed to fetch upload stats: ${uploadError.message}`);
      }

      return {
        messages: messages?.length || 0,
        uploads: uploads?.length || 0,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        throw new Error('Network error: Failed to fetch usage stats. Please check your internet connection.');
      }
      throw error;
    }
  },
};

// File upload operations
export const fileUploadApi = {
  async uploadFile(userId: string, file: File, path: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('chat-uploads')
      .upload(`${userId}/${path}`, file);

    if (error) throw error;

    // Save to uploads table
    const { error: dbError } = await supabase
      .from('file_uploads')
      .insert({
        user_id: userId,
        file_name: file.name,
        file_path: data.path,
        file_size: file.size,
        uploaded_at: new Date().toISOString(),
      });

    if (dbError) throw dbError;

    return data.path;
  },

  async getFileUrl(path: string): Promise<string> {
    const { data } = supabase.storage
      .from('chat-uploads')
      .getPublicUrl(path);

    return data.publicUrl;
  },
};
