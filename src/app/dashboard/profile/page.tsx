// app/dashboard/profile/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [name, setName] = useState(session?.user?.name || "");
  const [email, setEmail] = useState(session?.user?.email || "");
  const [image, setImage] = useState(session?.user?.image || "");
  const [editing, setEditing] = useState(false);

  if (status === "loading") return <p className="text-white p-4">Loading...</p>;
  if (!session) return <p className="text-white p-4">Access denied. Please sign in.</p>;

  const handleSave = () => {
    // Future: Send data to API or DB
    console.log("Saved:", { name, email, image });
    setEditing(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">👤 Edit Profile</h1>

      <div className="bg-zinc-800 p-6 rounded-xl shadow space-y-4">
        <div>
          <label className="block mb-2 text-sm">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!editing}
            className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded"
          />
        </div>

        <div>
          <label className="block mb-2 text-sm">Email</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-zinc-400"
          />
        </div>

        <div>
          <label className="block mb-2 text-sm">Profile Image URL</label>
          <input
            type="text"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            disabled={!editing}
            className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded"
          />
        </div>

        <div className="flex gap-4">
          {editing ? (
            <>
              <button onClick={handleSave} className="bg-blue-600 px-4 py-2 rounded">Save</button>
              <button onClick={() => setEditing(false)} className="bg-zinc-600 px-4 py-2 rounded">Cancel</button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="bg-green-600 px-4 py-2 rounded">Edit Profile</button>
          )}
        </div>
      </div>
    </div>
  );
}
