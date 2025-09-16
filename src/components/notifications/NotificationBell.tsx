// src/components/notifications/NotificationBell.tsx
"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCircle, X, Trash2 } from "lucide-react";

type AppNotification = {
  id: string;
  title: string;
  body: string;
  date: string; // ISO or friendly
};

const ANNOUNCEMENTS: AppNotification[] = [

  {
    id: "risk-ai-guard-rollout",
    title: "New Risk & Prop Features",
    body:
      "Tilt Mode Detector, Prop Dashboard, Optimal Strategy Matcher, and Daily Loss & Drawdown Guard are now live. Gated by plan tiers with easy upgrade inside Analytics.",
    date: new Date().toISOString(),
  },
  {
    id: "ai-features-rollout",
    title: "New AI Features Across Plans",
    body:
      "Personalized strategy recommendations, risk analysis, market timing, real-time analytics, and image-based trade reviews are now live for Pro/Plus/Elite plans.",
    date: new Date().toISOString(),
  },
  {
    id: "admin-analytics-live",
    title: "Admin: Real-time Platform Analytics",
    body:
      "Live dashboard shows total trades (added/imported/deleted), total PnL, most active day/time, sessions, and average trade duration.",
    date: new Date().toISOString(),
  },
  {
    id: "risk-controls-v1",
    title: "New: Automated Risk Controls & Prop Sim",
    body:
      "Set your own guardrails, get breach alerts, and run a prop-firm challenge demo with targets and loss limits.",
    date: new Date().toISOString(),
  },
  {
    id: "coach-tab-move",
    title: "AI Mental Coach is now in Analytics",
    body:
      "Find the AI Mental Coach inside Trade Analytics under its own subtab – a smoother, more focused workflow.",
    date: new Date().toISOString(),
  },
  {
    id: "flutterwave-modes",
    title: "Flutterwave: Choose your payment method",
    body:
      "Card, bank transfer, USSD, QR, and mobile money are now supported. Plans activate only after successful payment.",
    date: new Date().toISOString(),
  },
  {
    id: "ui-refresh",
    title: "UI Refresh: Sharper Logo & Light Mode",
    body:
      "Clearer branding, refined light theme contrast, and rounded elements for a more polished experience.",
    date: new Date().toISOString(),
  },
];

const STORAGE_KEY_READ = "notif_read_ids_v1";
const STORAGE_KEY_ITEMS = "notif_items_v1";
const STORAGE_KEY_DELETED = "notif_deleted_ids_v1";

function useNotificationState() {
  const [open, setOpen] = React.useState(false);
  const [readIds, setReadIds] = React.useState<string[]>([]);
  const [deletedIds, setDeletedIds] = React.useState<string[]>([]);
  const [items, setItems] = React.useState<AppNotification[]>([]);

  React.useEffect(() => {
    try {
      const r = localStorage.getItem(STORAGE_KEY_READ);
      if (r) setReadIds(JSON.parse(r));
      const d = localStorage.getItem(STORAGE_KEY_DELETED);
      if (d) setDeletedIds(JSON.parse(d));
      const i = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (i) {
        // Existing stored items: parse and use
        const parsed: AppNotification[] = JSON.parse(i);
        setItems(Array.isArray(parsed) ? parsed : []);
      } else {
        // First run: seed announcements into storage
        localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(ANNOUNCEMENTS));
        setItems(ANNOUNCEMENTS);
      }
    } catch {}
  }, []);

  const persist = (next: string[]) => {
    setReadIds(next);
    try { localStorage.setItem(STORAGE_KEY_READ, JSON.stringify(next)); } catch {}
  };

  const markAllRead = () => persist(Array.from(new Set([...readIds, ...ANNOUNCEMENTS.map(a => a.id)])));
  const markRead = (id: string) => persist(Array.from(new Set([...readIds, id])));

  const persistItems = (list: AppNotification[]) => {
    setItems(list);
    try { localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(list)); } catch {}
  };

  const persistDeleted = (list: string[]) => {
    setDeletedIds(list);
    try { localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify(list)); } catch {}
  };

  // Merge any new announcements not yet stored and not deleted
  React.useEffect(() => {
    if (!items) return;
    try {
      const currentIds = new Set(items.map(i => i.id));
      const deletedSet = new Set(deletedIds);
      const toAdd = ANNOUNCEMENTS.filter(a => !currentIds.has(a.id) && !deletedSet.has(a.id));
      if (toAdd.length) {
        const merged = [...items, ...toAdd];
        persistItems(merged);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deletedIds]);

  const removeItem = (id: string) => {
    const next = items.filter(i => i.id !== id);
    persistItems(next);
    const nextDeleted = Array.from(new Set([...deletedIds, id]));
    persistDeleted(nextDeleted);
    // also remove from readIds tracking to keep sets small
    const nextRead = readIds.filter(r => r !== id);
    persist(nextRead);
  };

  const unread = items.filter((a) => !readIds.includes(a.id));

  return { open, setOpen, readIds, markAllRead, markRead, unread, all: items, removeItem };
}

export default function NotificationBell() {
  const { open, setOpen, unread, all, markAllRead, markRead, removeItem } = useNotificationState();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-gray-200" />
        {unread.length > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-blue-500 shadow"
            aria-hidden
            title={`${unread.length} new`}
          />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[1200]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />

            <motion.div
              role="dialog"
              aria-modal="true"
              className="absolute right-4 top-16 w-[95%] max-w-lg bg-[#111827] text-white border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-[#0B1220]">
                <div className="font-semibold">Inbox</div>
                <div className="flex items-center gap-2">
                  {unread.length > 0 && (
                    <button
                      onClick={() => markAllRead()}
                      className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-500"
                    >
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-white/10" aria-label="Close">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-[70vh] overflow-y-auto divide-y divide-gray-800">
                {all.map((n) => {
                  const isUnread = unread.some((u) => u.id === n.id);
                  return (
                    <div key={n.id} className="p-4 hover:bg-white/5">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {isUnread ? (
                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{n.title}</div>
                          <div className="text-sm text-gray-300 mt-1">{n.body}</div>
                          <div className="text-xs text-gray-500 mt-2">{new Date(n.date).toLocaleString()}</div>
                          <div className="mt-2 flex items-center gap-2">
                            {isUnread && (
                              <button
                                onClick={() => markRead(n.id)}
                                className="text-xs px-2 py-1 rounded border border-blue-500 text-blue-300 hover:bg-blue-500/10"
                              >
                                Mark as read
                              </button>
                            )}
                            <button
                              onClick={() => removeItem(n.id)}
                              className="text-xs px-2 py-1 rounded border border-red-500 text-red-300 hover:bg-red-500/10 inline-flex items-center gap-1"
                              title="Delete notification"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {all.length === 0 && (
                  <div className="p-6 text-center text-gray-400">No messages yet.</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
