"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Notification } from "@/components/ui/notification";

type NoticeVariant = "default" | "destructive" | "success" | "warning" | "info";

type Notice = {
  id: string;
  variant?: NoticeVariant;
  title?: string;
  description?: string;
  timeoutMs?: number;
};

type Ctx = {
  notify: (n: Omit<Notice, "id">) => void;
};

const NotificationContext = createContext<Ctx | null>(null);

export function useNotification(): Ctx {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotification must be used within NotificationProvider");
  return ctx;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<Notice[]>([]);

  const dismiss = useCallback((id: string) => {
    setQueue((q) => q.filter((n) => n.id !== id));
  }, []);

  const notify = useCallback((n: Omit<Notice, "id">) => {
    const id = Math.random().toString(36).slice(2);
    const notice: Notice = { id, timeoutMs: 4000, ...n };
    setQueue((q) => [notice, ...q].slice(0, 4));
    if (notice.timeoutMs && notice.timeoutMs > 0) {
      setTimeout(() => dismiss(id), notice.timeoutMs);
    }
  }, [dismiss]);

  // Override window.alert to route to in-app banner
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const original = window.alert;
    window.alert = (msg?: any) => {
      try {
        notify({ variant: 'info', title: 'Notice', description: String(msg ?? '') });
      } catch {
        original(String(msg ?? ''));
      }
    };
    return () => { window.alert = original; };
  }, [notify]);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[1000] w-[95%] max-w-xl space-y-2">
        {queue.map((n) => (
          <Notification
            key={n.id}
            variant={n.variant}
            title={n.title}
            description={n.description}
            onClose={() => dismiss(n.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}
