"use client";

import React, { useState, useEffect, useCallback, createContext, useContext } from "react";
import { Notification } from "@/components/ui/notification";
import { motion, AnimatePresence } from "framer-motion";

export interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  notifications: NotificationItem[];
  addNotification: (notification: Omit<NotificationItem, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const addNotification = useCallback((notification: Omit<NotificationItem, 'id'>) => {
    const id = Date.now().toString();
    const newNotification: NotificationItem = {
      ...notification,
      id,
      duration: notification.duration ?? 5000,
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove after duration
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  // Add some demo notifications on mount
  useEffect(() => {
    // Welcome notification
    setTimeout(() => {
      addNotification({
        type: 'info',
        title: 'Welcome to Tradia!',
        description: 'Your AI trading coach is ready to help you improve.',
        duration: 10000,
      });
    }, 2000);

    // Trading insights notification
    setTimeout(() => {
      addNotification({
        type: 'success',
        title: 'Trading Insight Available',
        description: 'Your win rate has improved by 5% this week!',
        action: {
          label: 'View Details',
          onClick: () => console.log('View trading insights'),
        },
      });
    }, 5000);
  }, [addNotification]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      removeNotification,
      clearAll,
    }}>
      {children}

      {/* Notification Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        <AnimatePresence>
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 300, scale: 0.3 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 300, scale: 0.5, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 500, damping: 40 }}
            >
              <Notification
                variant={notification.type === 'error' ? 'destructive' : notification.type}
                title={notification.title}
                description={notification.description}
                onClose={() => removeNotification(notification.id)}
                icon={notification.type === 'success' ? 'success' :
                  notification.type === 'error' ? 'error' :
                    notification.type === 'warning' ? 'warning' : 'info'}
              >
                {notification.action && (
                  <div className="mt-3">
                    <button
                      onClick={notification.action.onClick}
                      className="text-sm font-medium underline hover:no-underline"
                    >
                      {notification.action.label}
                    </button>
                  </div>
                )}
              </Notification>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Clear All Button */}
      {notifications.length > 1 && (
        <div className="fixed top-4 right-4 z-40">
          <button
            onClick={clearAll}
            className="bg-[#0f1319] text-white px-3 py-1 rounded-full text-xs hover:bg-gray-700 transition-colors"
          >
            Clear All ({notifications.length})
          </button>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;