import { useCallback } from 'react';
import { Message, ChatState } from '../types';
import { sanitizeInput } from '../utils';
import { apiClient, ApiClientError, globalRateLimiter } from '../../../lib/api-client';

interface UseChatActionsProps {
  state: ChatState;
  dispatch: React.Dispatch<any>;
  trades: any[];
  saveMessage: (message: Message) => Promise<void>;
}

export function useChatActions({ state, dispatch, trades, saveMessage }: UseChatActionsProps) {
  const pushSystemMessage = useCallback((content: string, variant: Message['variant'] = 'default') => {
    const message: Message = {
      id: `${Date.now()}-system`,
      type: 'assistant',
      content,
      timestamp: new Date(),
      variant,
    };
    dispatch({ type: 'ADD_MESSAGE', payload: message });
  }, [dispatch]);

  const handleSendMessage = useCallback(async () => {
    if (!state.inputMessage.trim()) return;

    const sanitizedMessage = sanitizeInput(state.inputMessage);
    if (!sanitizedMessage) {
      pushSystemMessage('Please enter a valid message.', 'system');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: sanitizedMessage,
      timestamp: new Date(),
    };

    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
    dispatch({ type: 'SET_INPUT', payload: '' });
    dispatch({ type: 'SET_TYPING', payload: true });



    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: sanitizedMessage,
          tradeHistory: trades,
          mode: state.assistantMode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `API request failed: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse: string = data.response || "Sorry, I couldn't generate a response.";

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
        mode: state.assistantMode,
      };
      dispatch({ type: 'ADD_MESSAGE', payload: aiMessage });
      await saveMessage(aiMessage);
    } catch (error: any) {
      console.error('Error sending message:', error);
      pushSystemMessage(`Sorry, I encountered an issue processing that: ${error.message}. Please try again.`, 'system');
    } finally {
      dispatch({ type: 'SET_TYPING', payload: false });
    }
  }, [state.inputMessage, state.assistantMode, trades, dispatch, pushSystemMessage, saveMessage]);

  return { pushSystemMessage, handleSendMessage };
}
