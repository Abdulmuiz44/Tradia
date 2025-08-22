"use client";

import React, { useEffect, useState } from "react";
import { Switch } from "@headlessui/react";
import {
  Sun,
  Moon,
  Bell,
  User,
  Settings,
  Save,
  Info,
  Clock,
  Globe,
  DollarSign,
  RefreshCw,
} from "lucide-react";
import { useSession } from "next-auth/react";

type SettingsShape = {
  theme: "system" | "light" | "dark";
  notifications: boolean;
  showBalance: boolean;
  compactMode: boolean;
  autoSave: boolean;
  showTooltips: boolean;
  defaultTimeframe: string;
  timezone?: string;
  currency?: string;
  emailPromos?: boolean;
};

const DEFAULT_SETTINGS: SettingsShape = {
  theme: "system",
  notifications: true,
  showBalance: true,
  compactMode: false,
  autoSave: true,
  showTooltips: true,
  defaultTimeframe: "1H",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  currency: "USD",
  emailPromos: false,
};

const TIMEFRAMES = ["15M", "30M", "1H", "4H", "1D"];
const CURRENCIES = ["USD", "EUR", "GBP", "NGN", "AUD", "CAD"];

export default function SettingsPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<SettingsShape>(DEFAULT_SETTINGS);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // load from localStorage quickly then fetch from server
  useEffect(() => {
    try {
      const cached = typeof window !== "undefined" && localStorage.getItem("tradia_settings");
      if (cached) {
        setSettings((s) => ({ ...s, ...(JSON.parse(cached) as Partial<SettingsShape>) }));
      }
    } catch {}

    (async () => {
      try {
        const res = await fetch("/api/user/settings", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (json?.settings) {
            // merge server settings into local state and persist to localStorage
            setSettings((prev) => {
              const next = { ...prev, ...(json.settings as Partial<SettingsShape>) };
              try {
                localStorage.setItem("tradia_settings", JSON.stringify(next));
              } catch {}
              return next;
            });
          }
        }
      } catch (e) {
        // network error => keep local fallback
        console.warn("Failed to load server settings, using local:", e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // helper to update a key and mark dirty
  function update<K extends keyof SettingsShape>(key: K, value: SettingsShape[K]) {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem("tradia_settings", JSON.stringify(next));
      } catch {}
      return next;
    });
    setDirty(true);
    setInfo(null);
    setError(null);
  }

  // Save to server (PATCH)
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `Save failed (${res.status})`);
      }
      setDirty(false);
      setInfo("Settings saved.");
    } catch (e: any) {
      console.error("Save settings error:", e);
      setError(e?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults (client only) - still mark dirty so user can save
  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.setItem("tradia_settings", JSON.stringify(DEFAULT_SETTINGS));
    } catch {}
    setDirty(true);
    setInfo("Reset to defaults (not saved until you click Save).");
  };

  // Auto-save if enabled
  useEffect(() => {
    if (settings.autoSave && dirty && !saving) {
      const t = setTimeout(() => {
        handleSave();
      }, 1000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.autoSave, dirty]);

  // UX helper: show indication if user not logged in
  if (!session) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Settings</h1>
        <div className="text-sm text-muted-foreground">Sign in to persist your settings.</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <div className="text-sm text-muted-foreground">
          {isLoading ? "Loading…" : dirty ? "Unsaved changes" : "Saved"}
        </div>
      </div>

      <div className="space-y-6 bg-white dark:bg-[#0B1220] p-6 rounded-lg shadow">
        {/* Theme */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            {settings.theme === "dark" ? <Moon /> : settings.theme === "light" ? <Sun /> : <Globe />}
            <div>
              <div className="font-medium">Theme</div>
              <div className="text-sm text-muted-foreground">Choose theme for the app</div>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <label className={`px-3 py-2 rounded border ${settings.theme === "system" ? "border-blue-500" : "border-transparent"}`}>
              <input type="radio" name="theme" checked={settings.theme === "system"} onChange={() => update("theme", "system")} />{" "}
              <span className="ml-2">System</span>
            </label>
            <label className={`px-3 py-2 rounded border ${settings.theme === "light" ? "border-blue-500" : "border-transparent"}`}>
              <input type="radio" name="theme" checked={settings.theme === "light"} onChange={() => update("theme", "light")} />{" "}
              <span className="ml-2">Light</span>
            </label>
            <label className={`px-3 py-2 rounded border ${settings.theme === "dark" ? "border-blue-500" : "border-transparent"}`}>
              <input type="radio" name="theme" checked={settings.theme === "dark"} onChange={() => update("theme", "dark")} />{" "}
              <span className="ml-2">Dark</span>
            </label>
          </div>
        </div>

        {/* Toggles grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ToggleRow
            icon={<Bell />}
            label="Enable Notifications"
            desc="Show desktop notifications for trade alerts"
            value={settings.notifications}
            onChange={(v) => update("notifications", v)}
          />
          <ToggleRow
            icon={<User />}
            label="Show Account Balance"
            desc="Display balance in header and overviews"
            value={settings.showBalance}
            onChange={(v) => update("showBalance", v)}
          />
          <ToggleRow
            icon={<Settings />}
            label="Compact View"
            desc="More compact tables and lists"
            value={settings.compactMode}
            onChange={(v) => update("compactMode", v)}
          />
          <ToggleRow
            icon={<Save />}
            label="Auto Save"
            desc="Automatically save settings when changed"
            value={settings.autoSave}
            onChange={(v) => update("autoSave", v)}
          />
          <ToggleRow
            icon={<Info />}
            label="Show Hints & Tooltips"
            desc="Show small help text and tips across the app"
            value={settings.showTooltips}
            onChange={(v) => update("showTooltips", v)}
          />
          <ToggleRow
            icon={<RefreshCw />}
            label="Email promos"
            desc="Receive occasional product updates and promotions"
            value={settings.emailPromos ?? false}
            onChange={(v) => update("emailPromos", v)}
          />
        </div>

        {/* Timeframe and currency */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock />
              <div>
                <div className="font-medium">Default Timeframe</div>
                <div className="text-sm text-muted-foreground">Used when opening charts</div>
              </div>
            </div>
            <select value={settings.defaultTimeframe} onChange={(e) => update("defaultTimeframe", e.target.value)} className="w-full p-2 rounded bg-gray-50 dark:bg-[#071018]">
              {TIMEFRAMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign />
              <div>
                <div className="font-medium">Default Currency</div>
                <div className="text-sm text-muted-foreground">Displayed currency for balances & P/L</div>
              </div>
            </div>
            <select value={settings.currency} onChange={(e) => update("currency", e.target.value)} className="w-full p-2 rounded bg-gray-50 dark:bg-[#071018]">
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Timezone */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Globe />
            <div>
              <div className="font-medium">Timezone</div>
              <div className="text-sm text-muted-foreground">Used for timestamps shown across the app</div>
            </div>
          </div>
          <input type="text" value={settings.timezone} onChange={(e) => update("timezone", e.target.value)} className="w-full p-2 rounded bg-gray-50 dark:bg-[#071018]" />
          <div className="text-sm text-muted-foreground mt-1">Default resolved from your browser. You may enter any IANA timezone (e.g. Europe/London).</div>
        </div>

        {/* Save / reset */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-2 items-center">
            <button onClick={handleSave} disabled={!dirty || saving} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60">
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button onClick={handleReset} className="px-3 py-2 border rounded text-sm">
              Reset to defaults
            </button>
          </div>
          <div className="text-sm text-muted-foreground">
            {error ? <span className="text-red-500">{error}</span> : info ? <span className="text-green-500">{info}</span> : "Settings persist to your account."}
          </div>
        </div>
      </div>
    </div>
  );
}

/** small Toggle row component */
function ToggleRow({ icon, label, desc, value, onChange }: { icon: React.ReactNode; label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-2 rounded border border-transparent hover:border-gray-200 dark:hover:border-zinc-700 transition">
      <div className="flex items-start gap-3">
        <div className="pt-1">{icon}</div>
        <div>
          <div className="font-medium">{label}</div>
          {desc && <div className="text-sm text-muted-foreground">{desc}</div>}
        </div>
      </div>

      <Switch checked={value} onChange={onChange} className={`${value ? "bg-blue-600" : "bg-gray-300"} relative inline-flex h-6 w-11 items-center rounded-full`}>
        <span className={`${value ? "translate-x-6" : "translate-x-1"} inline-block h-4 w-4 transform rounded-full bg-white transition`} />
      </Switch>
    </div>
  );
}
