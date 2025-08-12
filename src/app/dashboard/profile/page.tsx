// app/dashboard/profile/page.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UploadCloud } from "lucide-react";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const initialName = (session?.user?.name as string) ?? "";
  const initialEmail = (session?.user?.email as string) ?? "";
  const initialImage = (session?.user?.image as string) ?? "";

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [email] = useState(initialEmail); // read only
  const [imageUrl, setImageUrl] = useState<string | null>(initialImage || null);

  // optional local-only fields (not persisted by default)
  const [phone, setPhone] = useState<string>("");
  const [bio, setBio] = useState<string>("");

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setName(initialName);
    setImageUrl(initialImage || null);
  }, [initialName, initialImage]);

  if (status === "loading") return <p className="text-white p-4">Loading profile…</p>;
  if (!session) return <p className="text-white p-4">Access denied. Please sign in.</p>;

  const goBack = () => router.push("/dashboard");

  // Convert file to data URL
  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onerror = () => rej(new Error("Failed to read file"));
      reader.onload = () => res(String(reader.result));
      reader.readAsDataURL(file);
    });

  // Upload avatar flow: convert file -> POST { fileName, data } -> get imageUrl
  const uploadAvatar = async (file: File) => {
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      setPreviewSrc(dataUrl);

      const res = await fetch("/api/user/upload-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, data: dataUrl }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Upload failed (${res.status})`);
      }

      const json = await res.json();
      if (!json?.imageUrl) throw new Error("No image URL returned from server");
      setImageUrl(json.imageUrl);
      setPreviewSrc(null);
      setMessage("Profile image uploaded.");
    } catch (err: any) {
      console.error("Avatar upload failed:", err);
      setError(err?.message || "Avatar upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadAvatar(file);
  };

  // Trigger the hidden file input
  const triggerFileInput = () => fileRef.current?.click();

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      // We only persist `name` and `image` in the DB because your current Prisma schema includes those.
      const payload = { name, image: imageUrl };

      const res = await fetch("/api/user/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Save failed (${res.status})`);
      }

      const json = await res.json();
      setMessage("Profile updated successfully.");

      // refresh UI / server components. This helps pick up server-side changes.
      router.refresh();

      // stop editing
      setEditing(false);
    } catch (err: any) {
      console.error("Profile update failed:", err);
      setError(err?.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setError(null);
    setMessage(null);
    setName(initialName);
    setImageUrl(initialImage || null);
    setPreviewSrc(null);
    setPhone("");
    setBio("");
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={goBack} aria-label="Back to dashboard" className="p-2 rounded-md hover:bg-zinc-700 transition">
          <ArrowLeft className="text-white" />
        </button>
        <h1 className="text-3xl font-bold">👤 Edit Profile</h1>
      </div>

      <div className="bg-zinc-800 p-6 rounded-xl shadow space-y-4">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="w-36 h-36 rounded-full overflow-hidden bg-zinc-900 border border-zinc-700 flex items-center justify-center">
            {previewSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewSrc} alt="Avatar preview" className="w-full h-full object-cover" />
            ) : imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="text-sm text-zinc-400 text-center px-2">No image</div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3">
              <button onClick={triggerFileInput} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-white" disabled={uploading} title="Upload avatar">
                <UploadCloud className="w-4 h-4" />
                {uploading ? "Uploading..." : "Upload Avatar"}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
              <span className="text-sm text-zinc-400">Recommended: square image, ≤1MB</span>
            </div>
            <p className="text-sm text-zinc-300 mt-3">Your profile image is used across Tradia to help personalize your account.</p>
          </div>
        </div>

        <div>
          <label className="block mb-2 text-sm text-zinc-300">Full name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={!editing} className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-white" />
        </div>

        <div>
          <label className="block mb-2 text-sm text-zinc-300">Email</label>
          <input type="email" value={email} disabled className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-zinc-400" />
        </div>

        <div>
          <label className="block mb-2 text-sm text-zinc-300">Phone (local only)</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!editing} className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-white" placeholder="+1 555 555 5555" />
        </div>

        <div>
          <label className="block mb-2 text-sm text-zinc-300">About / Bio (local only)</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} disabled={!editing} className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-white min-h-[90px]" placeholder="Tell people a little about your trading style or goals." />
        </div>

        {message && <div className="p-2 bg-green-700 text-white rounded">{message}</div>}
        {error && <div className="p-2 bg-red-700 text-white rounded">{error}</div>}

        <div className="flex gap-3">
          {editing ? (
            <>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 text-white">{saving ? "Saving…" : "Save"}</button>
              <button onClick={handleCancel} className="px-4 py-2 bg-zinc-700 rounded hover:bg-zinc-600 text-white">Cancel</button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 text-white">Edit Profile</button>
          )}

          <button onClick={() => router.push("/dashboard")} className="px-4 py-2 bg-zinc-700 rounded hover:bg-zinc-600 text-white">Back to Dashboard</button>
        </div>
      </div>
    </div>
  );
}
