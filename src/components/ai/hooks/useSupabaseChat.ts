import { useEffect, useCallback } from 'react';
import { Message, UserTier } from '../types';
import { getPlanLimits } from '../utils';
import { chatMessagesApi } from '../supabase';

interface UseSupabaseChatProps {
  userId: string;
  userTier: UserTier['type'];
  onMessagesLoaded: (messages: Message[]) => void;
  onError: (error: string) => void;
}

export function useSupabaseChat({
  userId,
  userTier,
  onMessagesLoaded,
  onError,
}: UseSupabaseChatProps) {
  const limits = getPlanLimits(userTier);

  const loadMessages = useCallback(async () => {
    try {
      // -1 means unlimited history, so don't limit by date
      const daysBack = limits.messageHistoryDays === -1 ? undefined : limits.messageHistoryDays;
      console.log('Loading messages:', { userId, daysBack });
      const messages = await chatMessagesApi.loadMessages(userId, daysBack);
      console.log('Loaded messages:', messages.length);
      onMessagesLoaded(messages);
    } catch (error: any) {
      console.error('Failed to load messages:', error);
      onError(`Failed to load messages: ${error.message}`);
    }
  }, [userId, limits.messageHistoryDays, onMessagesLoaded, onError]);

  const saveMessage = useCallback(async (message: Message) => {
    try {
      console.log('Saving message:', { userId, messageId: message.id, content: message.content?.slice(0, 50) });
      await chatMessagesApi.saveMessage(userId, message);
      console.log('Message saved successfully');
    } catch (error: any) {
      console.error('Failed to save message:', error);
      onError(`Failed to save message: ${error.message}`);
    }
  }, [userId, onError]);

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      await chatMessagesApi.deleteMessage(userId, messageId);
    } catch (error: any) {
      onError(`Failed to delete message: ${error.message}`);
    }
  }, [userId, onError]);

  const updateMessage = useCallback(async (messageId: string, content: string) => {
    try {
      await chatMessagesApi.updateMessage(userId, messageId, content);
    } catch (error: any) {
      onError(`Failed to update message: ${error.message}`);
    }
  }, [userId, onError]);

  const getUsageStats = useCallback(async (date: string) => {
    try {
      return await chatMessagesApi.getUsageStats(userId, date);
    } catch (error: any) {
      onError(error.message); // Pass specific error message
      return { messages: 0, uploads: 0 };
    }
  }, [userId, onError]);

  useEffect(() => {
    if (userId) {
      loadMessages();
    }
  }, [userId, loadMessages]);

  return {
    saveMessage,
    deleteMessage,
    updateMessage,
    getUsageStats,
    loadMessages,
  };
}
