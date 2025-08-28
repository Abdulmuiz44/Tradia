"use client";

import React, { useEffect, useRef, useState, ChangeEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UploadCloud } from "lucide-react";
import Spinner from "@/components/ui/spinner";

type CountryOption = { label: string; value: string };

const DEFAULT_COUNTRIES: CountryOption[] = [
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
};

export default function ProfilePage(): React.ReactElement {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  const sessionName = String(session?.user?.name ?? "");
  const sessionEmail = String(session?.user?.email ?? "");
  const sessionImage = String(session?.user?.image ?? "");

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState<string>(sessionName);
  const email = sessionEmail;

  const [imageUrl, setImageUrl] = useState<string | null>(sessionImage || null);
  const [countryOptions, setCountryOptions] = useState<CountryOption[]>(DEFAULT_COUNTRIES);

  const initialCountryFromSession = (session as any)?.user?.country;
  const [country, setCountry] = useState<string>(
    typeof initialCountryFromSession === "string" && initialCountryFromSession
      ? initialCountryFromSession
      : DEFAULT_COUNTRIES[0].value
  );

  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [tradingStyle, setTradingStyle] = useState<string>("");
  const [tradingExperience, setTradingExperience] = useState<string>("");
  const [bio, setBio] = useState<string>("");

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  /** --- Sync with session --- */
  useEffect(() => {
    setName(sessionName);
    setImageUrl(sessionImage || null);

    const sCountry = (session as any)?.user?.country;
    if (typeof sCountry === "string" && sCountry) {
      setCountryOptions((prev) =>
        prev.find((c) => c.value === sCountry) ? prev : [{ label: sCountry, value: sCountry }, ...prev]
      );
      setCountry(sCountry);
    }

    const sPhone = (session as any)?.user?.phone;
    if (typeof sPhone === "string" && sPhone) {
      setPhoneNumber(sPhone);
    }

    if ((session as any)?.user?.tradingStyle) setTradingStyle((session as any).user.tradingStyle);
    if ((session as any)?.user?.tradingExperience) setTradingExperience((session as any).user.tradingExperience);
    if ((session as any)?.user?.bio) setBio((session as any).user.bio);
  }, [sessionName, sessionImage, session, countryOptions]);

  /** --- Auth check (NextAuth or JWT fallback) --- */
  function getCookie(name: string) {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : null;
  }
  function parseJwtPayload(token: string | null) {
    if (!token) return null;
    try {
      const parts = token.split(".");
      if (parts.length < 2) return null;
      const payload = parts[1];
      const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      const json = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
  useEffect(() => {
    if (session && (session as any).user) {
      setIsAuthed(true);
      setAuthChecked(true);
      return;
    }
    try {
      const token = getCookie("session") || getCookie("app_token");
      if (token) {
        const payload = parseJwtPayload(token);
        setIsAuthed(payload?.email_verified === true);
      } else {
        setIsAuthed(false);
      }
    } catch {
      setIsAuthed(false);
    } finally {
      setAuthChecked(true);
    }
  }, [session]);

  if (status === "loading") return <Spinner />;
  if (!authChecked) return <Spinner />;
  if (!isAuthed) return <p className="text-white p-4">Access denied. Please sign in.</p>;

  /** --- File Upload --- */
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
      if (file.size > 1.5 * 1024 * 1024) throw new Error("File too large (max 1.5MB).");
      const dataUrl = await fileToDataUrl(file);
      setPreviewSrc(dataUrl);

      const res = await fetch("/api/user/upload-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, data: dataUrl }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      if (!json?.imageUrl) throw new Error("No image URL returned from server");
      setImageUrl(json.imageUrl);
      setPreviewSrc(null);
      setMessage("Profile image uploaded.");
    } catch (err) {
      setPreviewSrc(null);
      setError("Avatar upload failed.");
    } finally {
      setUploading(false);
    }
  };
  const onFileChange = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (file) await uploadAvatar(file);
  };
  const triggerFileInput = (): void => void fileRef.current?.click();

  /** --- Save --- */
  const selectedDialCode = country.split("|")[1] ?? "+1";
  const handleSave = async (): Promise<void> => {
    setSaving(true);
    setError(null);
    setMessage(null);
    if (!name.trim()) {
      setError("Name cannot be empty.");
      setSaving(false);
      return;
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
      const res = await fetch("/api/user/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setMessage("Profile updated successfully.");
      router.refresh();
      setEditing(false);
    } catch (err: any) {
      setError(err.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  /** --- Cancel --- */
  const handleCancel = (): void => {
    setEditing(false);
    setError(null);
    setMessage(null);
    setName(sessionName);
    setImageUrl(sessionImage || null);
    setPreviewSrc(null);
    setPhoneNumber((session as any)?.user?.phone ?? "");
    setBio((session as any)?.user?.bio ?? "");
    setTradingStyle((session as any)?.user?.tradingStyle ?? "");
    setTradingExperience((session as any)?.user?.tradingExperience ?? "");
    setCountry((session as any)?.user?.country ?? DEFAULT_COUNTRIES[0].value);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push("/dashboard")} className="p-2 rounded-md hover:bg-zinc-700 transition">
          <ArrowLeft className="text-white" />
        </button>
        <h1 className="text-3xl font-bold">👤 Edit Profile</h1>
      </div>

      <div className="bg-zinc-800 p-6 rounded-xl shadow space-y-4">
        {/* Avatar Upload */}
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="w-36 h-36 rounded-full overflow-hidden bg-zinc-900 border border-zinc-700 flex items-center justify-center">
            {previewSrc ? (
              <img src={previewSrc} alt="Preview" className="w-full h-full object-cover" />
            ) : imageUrl ? (
              <img src={imageUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="text-sm text-zinc-400">No image</div>
            )}
          </div>
          <div className="flex-1">
            <button
              onClick={triggerFileInput}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-white"
              disabled={uploading}
            >
              <UploadCloud className="w-4 h-4" />
              {uploading ? "Uploading..." : "Upload Avatar"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block mb-2 text-sm text-zinc-300">Full name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={!editing}
            className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-white" />
        </div>

        {/* Email (disabled) */}
        <div>
          <label className="block mb-2 text-sm text-zinc-300">Email</label>
          <input type="email" value={email} disabled
            className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-zinc-400" />
        </div>

        {/* Country (disabled) + Phone (editable) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block mb-2 text-sm text-zinc-300">Country</label>
            <select value={country} disabled
              className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-white">
              {countryOptions.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block mb-2 text-sm text-zinc-300">Phone</label>
            <div className="flex gap-2">
              <input type="text" value={selectedDialCode} disabled
                className="w-20 bg-zinc-900 border border-zinc-700 p-2 rounded text-zinc-300" />
              <input type="tel" value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={!editing}
                className="flex-1 bg-zinc-900 border border-zinc-700 p-2 rounded text-white" />
            </div>
          </div>
        </div>

        {/* Trading Style / Experience */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block mb-2 text-sm text-zinc-300">Trading Style</label>
            <select value={tradingStyle} onChange={(e) => setTradingStyle(e.target.value)}
              disabled={!editing}
              className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-white">
              <option value="">Select style</option>
              {TRADING_STYLES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-2 text-sm text-zinc-300">Trading Experience</label>
            <select value={tradingExperience} onChange={(e) => setTradingExperience(e.target.value)}
              disabled={!editing}
              className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-white">
              <option value="">Select experience</option>
              {EXPERIENCE_LEVELS.map((lvl) => (
                <option key={lvl.value} value={lvl.value}>{lvl.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block mb-2 text-sm text-zinc-300">About / Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)}
            disabled={!editing}
            className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-white min-h-[90px]" />
        </div>

        {/* Messages */}
        {message && <div className="p-2 bg-green-700 text-white rounded">{message}</div>}
        {error && <div className="p-2 bg-red-700 text-white rounded">{error}</div>}

        {/* Actions */}
        <div className="flex gap-3">
          {editing ? (
            <>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 text-white">
                {saving ? "Saving…" : "Save"}
              </button>
              <button onClick={handleCancel}
                className="px-4 py-2 bg-zinc-700 rounded hover:bg-zinc-600 text-white">
                Cancel
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)}
              className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 text-white">
              Edit Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
