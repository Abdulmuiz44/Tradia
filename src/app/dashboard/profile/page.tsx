// src/app/dashboard/profile/page.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UploadCloud } from "lucide-react";
import countries from "@/lib/countries";

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

  // persisted user fields
  const [country, setCountry] = useState<string | null>(null);
  const [phoneCountryCode, setPhoneCountryCode] = useState<string | null>(null);
  const [phoneLocal, setPhoneLocal] = useState<string>(""); // local number without prefix
  const [tradingStyle, setTradingStyle] = useState<string>("");
  const [tradingExperience, setTradingExperience] = useState<string>("");

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Password change UI
  const [wantChangePassword, setWantChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    setName(initialName);
    setImageUrl(initialImage || null);

    // Try to prefill profile fields from session (if server put them into the session.user)
    if (session?.user) {
      const su = session.user as any;
      if (su.country) setCountry(su.country);
      if (su.phone) {
        // if phone is stored in session as full phone, try to infer
        setPhoneLocal(su.phone ?? "");
      }
      if (su.phone_country_code) setPhoneCountryCode(su.phone_country_code ?? null);
      if (su.trading_style) setTradingStyle(su.trading_style ?? "");
      if (su.trading_experience) setTradingExperience(su.trading_experience ?? "");
    }
  }, [initialName, initialImage, session]);

  if (status === "loading") return <p className="text-white p-4">Loading profile…</p>;
  if (!session) return <p className="text-white p-4">Access denied. Please sign in.</p>;

  const goBack = () => router.push("/dashboard");

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onerror = () => rej(new Error("Failed to read file"));
      reader.onload = () => res(String(reader.result));
      reader.readAsDataURL(file);
    });

  // Upload avatar to /api/user/upload-avatar (doesn't persist to DB)
  const uploadAvatar = async (file: File) => {
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const maxBytes = 1.5 * 1024 * 1024;
      if (file.size > maxBytes) throw new Error("File too large (max 1.5MB).");

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
      // Set image in the UI, but DO NOT persist to DB here
      setImageUrl(json.imageUrl);
      setPreviewSrc(null);
      setMessage("Profile image uploaded (not yet saved). Click Save to persist.");
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

  const triggerFileInput = () => fileRef.current?.click();

  // When user picks country -> update phone country code automatically
  const onCountryChange = (c: string) => {
    setCountry(c);
    const found = countries.find((x) => x.code === c || x.name === c);
    if (found) {
      setPhoneCountryCode(found.dial_code);
    } else {
      setPhoneCountryCode(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);

    if (!name || name.trim().length === 0) {
      setError("Name cannot be empty.");
      setSaving(false);
      return;
    }

    if (wantChangePassword) {
      if (!oldPassword || !newPassword || !confirmPassword) {
        setError("To change password, fill all password fields.");
        setSaving(false);
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("New password and confirmation do not match.");
        setSaving(false);
        return;
      }
      if (newPassword.length < 8) {
        setError("New password must be at least 8 characters.");
        setSaving(false);
        return;
      }
    }

    try {
      const payload: any = {
        name,
        image: imageUrl ?? null,
        country: country ?? null,
        trading_style: tradingStyle ?? null,
        trading_experience: tradingExperience ?? null,
        phone: phoneLocal ?? null,
        phone_country_code: phoneCountryCode ?? null,
      };

      if (wantChangePassword) {
        payload.oldPassword = oldPassword;
        payload.newPassword = newPassword;
      }

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
      if (!json?.success) {
        throw new Error(json?.error || "Save failed");
      }

      setMessage("Profile updated successfully.");
      // refresh server components so session/user info updates
      router.refresh();

      setEditing(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setWantChangePassword(false);
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
    // reset local-only fields (you may want to re-read session values instead)
    setPhoneLocal("");
    setPhoneCountryCode(session?.user?.phone_country_code ?? null);
    setCountry(session?.user?.country ?? null);
    setTradingStyle(session?.user?.trading_style ?? "");
    setTradingExperience(session?.user?.trading_experience ?? "");
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setWantChangePassword(false);
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
              <span className="text-sm text-zinc-400">Recommended: square image, ≤1.5MB</span>
            </div>
            <p className="text-sm text-zinc-300 mt-3">Your profile image is used across Tradia to help personalize your account. Uploading does not persist until you click Save.</p>
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
          <label className="block mb-2 text-sm text-zinc-300">Country</label>
          <select value={country ?? ""} onChange={(e) => onCountryChange(e.target.value)} disabled={!editing} className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-white">
            <option value="">Select country</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block mb-2 text-sm text-zinc-300">Phone country code</label>
            <input type="text" value={phoneCountryCode ?? ""} disabled className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-white" />
          </div>
          <div className="col-span-2">
            <label className="block mb-2 text-sm text-zinc-300">Phone number (local)</label>
            <input type="tel" value={phoneLocal} onChange={(e) => setPhoneLocal(e.target.value)} disabled={!editing} className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-white" placeholder="e.g. 555 1234" />
          </div>
        </div>

        <div>
          <label className="block mb-2 text-sm text-zinc-300">Trading style</label>
          <input type="text" value={tradingStyle} onChange={(e) => setTradingStyle(e.target.value)} disabled={!editing} className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-white" placeholder="e.g. Swing, Scalping, Micro" />
        </div>

        <div>
          <label className="block mb-2 text-sm text-zinc-300">Trading experience</label>
          <select value={tradingExperience} onChange={(e) => setTradingExperience(e.target.value)} disabled={!editing} className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-white">
            <option value="">Select experience</option>
            <option value="beginner">Beginner (&lt; 1 year)</option>
            <option value="intermediate">Intermediate (1-3 years)</option>
            <option value="advanced">Advanced (3+ years)</option>
            <option value="professional">Professional</option>
          </select>
        </div>

        {/* Password change toggle */}
        {editing && (
          <div className="p-3 border border-zinc-700 rounded">
            <label className="inline-flex items-center gap-2 mb-2">
              <input type="checkbox" checked={wantChangePassword} onChange={() => setWantChangePassword((v) => !v)} className="h-4 w-4" />
              <span className="text-sm text-zinc-300">Change password</span>
            </label>

            {wantChangePassword && (
              <div className="space-y-2 mt-2">
                <div>
                  <label className="block text-sm text-zinc-300 mb-1">Current password</label>
                  <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-white" />
                </div>
                <div>
                  <label className="block text-sm text-zinc-300 mb-1">New password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-white" />
                </div>
                <div>
                  <label className="block text-sm text-zinc-300 mb-1">Confirm new password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-white" />
                </div>
              </div>
            )}
          </div>
        )}

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
