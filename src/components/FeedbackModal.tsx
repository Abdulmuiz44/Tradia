// src/components/FeedbackModal.tsx
"use client";
import React, { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function FeedbackModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) {
  const supabase = createClientComponentClient();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const submit = async () => {
  setSaving(true);
  try {
  const user = await supabase.auth.getUser();
  const uid = user?.data?.user?.id ?? null;
  const userEmail = user?.data?.user?.email ?? null;
  await supabase.from("user_feedback").insert({ user_id: uid, user_email: userEmail, feedback_text: message, page: window.location.pathname, created_at: new Date().toISOString() });
  setMessage("");
  onClose();
    // optional: show toast
  } catch (e) {
  console.error(e);
    // show error toast
  } finally {
    setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="z-10 bg-slate-900 p-4 rounded w-full max-w-lg">
        <h3 className="font-semibold mb-2">Send feedback</h3>
        <textarea value={message} onChange={(e)=>setMessage(e.target.value)} className="w-full p-2 text-sm bg-black rounded border border-zinc-700" rows={6} />
        <div className="flex justify-end gap-2 mt-3">
          <button className="px-3 py-1 rounded bg-zinc-700" onClick={onClose}>Cancel</button>
          <button disabled={!message || saving} className="px-3 py-1 rounded bg-green-600" onClick={submit}>{saving ? "Sending..." : "Send"}</button>
        </div>
      </div>
    </div>
  );
}
