import { useState, useEffect, useCallback } from 'react';
import { Message } from '../types';

interface QueuedMessage {
  id: string;
  message: Message;
  timestamp: number;
  retryCount: number;
}

const MAX_RETRY_COUNT = 3;
const RETRY_DELAY = 1000; // 1 second

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedMessage[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load queue from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('tradia-offline-queue');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setQueue(parsed);
      } catch (error) {
        console.error('Failed to load offline queue:', error);
      }
    }
  }, []);

  // Save queue to localStorage
  const saveQueue = useCallback((newQueue: QueuedMessage[]) => {
    localStorage.setItem('tradia-offline-queue', JSON.stringify(newQueue));
    setQueue(newQueue);
  }, []);

  const addToQueue = useCallback((message: Message) => {
    const queuedMessage: QueuedMessage = {
      id: message.id,
      message,
      timestamp: Date.now(),
      retryCount: 0,
    };

    const newQueue = [...queue, queuedMessage];
    saveQueue(newQueue);
  }, [queue, saveQueue]);

  const removeFromQueue = useCallback((messageId: string) => {
    const newQueue = queue.filter(item => item.id !== messageId);
    saveQueue(newQueue);
  }, [queue, saveQueue]);

  const retryMessage = useCallback(async (queuedMessage: QueuedMessage, sendFunction: (msg: Message) => Promise<void>) => {
    try {
      await sendFunction(queuedMessage.message);
      removeFromQueue(queuedMessage.id);
    } catch (error) {
      console.error('Failed to retry message:', error);

      if (queuedMessage.retryCount < MAX_RETRY_COUNT) {
        // Exponential backoff
        const delay = RETRY_DELAY * Math.pow(2, queuedMessage.retryCount);
        setTimeout(() => {
          const updatedQueue = queue.map(item =>
            item.id === queuedMessage.id
              ? { ...item, retryCount: item.retryCount + 1 }
              : item
          );
          saveQueue(updatedQueue);
        }, delay);
      } else {
        // Max retries reached, remove from queue
        removeFromQueue(queuedMessage.id);
      }
    }
  }, [queue, removeFromQueue, saveQueue]);

  // Process queue when coming online
  useEffect(() => {
    if (isOnline && queue.length > 0) {
      // This would need to be passed the send function from the parent component
      // For now, just log that we're online
      console.log('Online - processing offline queue');
    }
  }, [isOnline, queue.length]);

  return {
    queue,
    isOnline,
    addToQueue,
    removeFromQueue,
    retryMessage,
  };
}
