"use client";

import React, { useEffect, useRef, useState, ChangeEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UploadCloud } from "lucide-react";

const COUNTRIES: { label: string; value: string }[] = [
  { label: "United States (+1)", value: "US|+1" },
  { label: "United Kingdom (+44)", value: "GB|+44" },
  { label: "Nigeria (+234)", value: "NG|+234" },
  { label: "India (+91)", value: "IN|+91" },
  { label: "Canada (+1)", value: "CA|+1" },
  { label: "Australia (+61)", value: "AU|+61" },
  { label: "Germany (+49)", value: "DE|+49" },
  { label: "France (+33)", value: "FR|+33" },
];

const TRADING_STYLES = [
  { label: "Scalping", value: "scalping" },
  { label: "Day trading", value: "day" },
  { label: "Swing trading", value: "swing" },
  { label: "Position trading", value: "position" },
  { label: "Algorithmic / Quant", value: "algo" },
] as const;

const EXPERIENCE_LEVELS = [
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
  { label: "Professional", value: "professional" },
] as const;

type UpdatePayload = {
  name?: string;
  image?: string | null;
  phone?: string;
  country?: string;
  tradingStyle?: string;
  tradingExperience?: string;
  bio?: string;
  oldPassword?: string;
  newPassword?: string;
};

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const initialName = String(session?.user?.name ?? "");
  const initialEmail = String(session?.user?.email ?? "");
  const initialImage = String(session?.user?.image ?? "");

  const [editing, setEditing] = useState<boolean>(false);
  const [name, setName] = useState<string>(initialName);
  const [email] = useState<string>(initialEmail); // read-only
  const [imageUrl, setImageUrl] = useState<string | null>(initialImage || null);

  const [country, setCountry] = useState<string>("US|+1");
  const [phoneNumber, setPhoneNumber] = useState<string>(""); // without code
  const [tradingStyle, setTradingStyle] = useState<string>("");
  const [tradingExperience, setTradingExperience] = useState<string>("");
  const [bio, setBio] = useState<string>("");

  const [uploading, setUploading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [wantChangePassword, setWantChangePassword] = useState<boolean>(false);
  const [oldPassword, setOldPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  useEffect(() => {
    setName(initialName);
    setImageUrl(initialImage || null);
  }, [initialName, initialImage]);

  useEffect(() => {
    let mounted = true;
    async function loadProfile(): Promise<void> {
      try {
        const res = await fetch("/api/user/profile", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (!mounted || !json) return;
        if (json.name) setName(String(json.name));
        if (json.image) setImageUrl(String(json.image));
        if (json.country) setCountry(String(json.country));
        if (json.phone) {
          const p = String(json.phone);
          if (p.startsWith("+")) {
            const parts = p.split(/\s+/);
            const code = parts[0];
            const match = COUNTRIES.find((c) => c.value.endsWith(`|${code}`));
            if (match) {
              setCountry(match.value);
              setPhoneNumber(parts.slice(1).join(" "));
            } else {
              setPhoneNumber(p);
            }
          } else {
            setPhoneNumber(p);
          }
        }
        if (json.tradingStyle) setTradingStyle(String(json.tradingStyle));
        if (json.tradingExperience) setTradingExperience(String(json.tradingExperience));
        if (json.bio) setBio(String(json.bio));
      } catch {
        // ignore — endpoint optional
      }
    }
    loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

  if (status === "loading") return <p className="text-white p-4">Loading profile…</p>;
  if (!session) return <p className="text-white p-4">Access denied. Please sign in.</p>;

  const goBack = (): void => void router.push("/dashboard");

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onerror = () => rej(new Error("Failed to read file"));
      reader.onload = () => res(String(reader.result));
      reader.readAsDataURL(file);
    });

  const uploadAvatar = async (file: File): Promise<void> => {
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
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Upload failed (${res.status})`);
      }

      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!json?.imageUrl || typeof json.imageUrl !== "string") throw new Error("No image URL returned from server");
      setImageUrl(json.imageUrl);
      setPreviewSrc(null);
      setMessage("Profile image uploaded.");
    } catch (unknownErr) {
      const message = unknownErr instanceof Error ? unknownErr.message : String(unknownErr);
      console.error("Avatar upload failed:", message);
      setError(message || "Avatar upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadAvatar(file);
  };

  const triggerFileInput = (): void => void fileRef.current?.click();

  const selectedDialCode = country.split("|")[1] ?? "+1";

  const handleSave = async (): Promise<void> => {
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
      const phoneToSend = phoneNumber ? `${selectedDialCode} ${phoneNumber.trim()}` : "";

      const payload: UpdatePayload = {
        name,
        image: imageUrl ?? null,
        phone: phoneToSend || undefined,
        country,
        tradingStyle,
        tradingExperience,
        bio,
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

      const text = await res.text();
      if (!res.ok) {
        let parsed: unknown = null;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = null;
        }
        const serverErr =
          parsed && typeof parsed === "object" && (parsed as Record<string, unknown>)["error"]
            ? String((parsed as Record<string, unknown>)["error"])
            : text || `Save failed (${res.status})`;
        throw new Error(serverErr);
      }

      const json = (text ? JSON.parse(text) : {}) as Record<string, unknown>;
      if (!json?.success && json?.success !== true) {
        throw new Error(typeof json?.error === "string" ? json.error : "Save failed");
      }

      setMessage("Profile updated successfully.");
      router.refresh();

      if (json.user && typeof json.user === "object") {
        if (typeof (json.user as Record<string, unknown>).image === "string") {
          setImageUrl((json.user as Record<string, unknown>).image as string);
        }
        if (typeof (json.user as Record<string, unknown>).name === "string") {
          setName((json.user as Record<string, unknown>).name as string);
        }
      }

      setEditing(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setWantChangePassword(false);
    } catch (unknownErr) {
      const message = unknownErr instanceof Error ? unknownErr.message : String(unknownErr);
      console.error("Profile update failed:", message);
      setError(message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = (): void => {
    setEditing(false);
    setError(null);
    setMessage(null);
    setName(initialName);
    setImageUrl(initialImage || null);
    setPreviewSrc(null);
    setPhoneNumber("");
    setBio("");
    setTradingStyle("");
    setTradingExperience("");
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setWantChangePassword(false);
    setCountry("US|+1");
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
              <button
                onClick={triggerFileInput}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-white"
                disabled={uploading}
                title="Upload avatar"
              >
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block mb-2 text-sm text-zinc-300">Country</label>
            <select value={country} onChange={(e) => setCountry(e.target.value)} disabled={!editing} className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-white">
              {COUNTRIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block mb-2 text-sm text-zinc-300">Phone</label>
            <div className="flex gap-2">
              <div className="min-w-[90px]">
                <input type="text" value={selectedDialCode} disabled className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-zinc-300" />
              </div>
              <div className="flex-1">
                <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="e.g. 555 555 5555" disabled={!editing} className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-white" />
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-1">Phone is combined with selected country code on save.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block mb-2 text-sm text-zinc-300">Trading Style</label>
            <select value={tradingStyle} onChange={(e) => setTradingStyle(e.target.value)} disabled={!editing} className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-white">
              <option value="">Select style</option>
              {TRADING_STYLES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-2 text-sm text-zinc-300">Trading Experience</label>
            <select value={tradingExperience} onChange={(e) => setTradingExperience(e.target.value)} disabled={!editing} className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-white">
              <option value="">Select experience</option>
              {EXPERIENCE_LEVELS.map((lvl) => (
                <option key={lvl.value} value={lvl.value}>
                  {lvl.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block mb-2 text-sm text-zinc-300">About / Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} disabled={!editing} className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-white min-h-[90px]" placeholder="Tell people a little about your trading style or goals." />
        </div>

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
