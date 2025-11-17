// src/app/dashboard/settings/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import {
  Settings,
  Moon,
  Sun,
  Bell,
  Shield,
  Globe,
  Save,
  RefreshCw
} from "lucide-react";
import FeatureLock from "@/components/FeatureLock";
import TrialStatusCard from "@/components/TrialStatusCard";

interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  marketPreference: 'forex' | 'crypto' | 'both';
  notifications: {
    email: boolean;
    push: boolean;
    tradeAlerts: boolean;
    weeklyReports: boolean;
  };
  privacy: {
    analytics: boolean;
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading, plan } = useUser();
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'dark',
    language: 'en',
    timezone: 'UTC',
    marketPreference: 'both',
    notifications: {
      email: true,
      push: true,
      tradeAlerts: true,
      weeklyReports: true
    },
    privacy: {
      analytics: true
    }
  });

  const [saving, setSaving] = useState(false);
  const [riskControls, setRiskControls] = useState<{ maxDailyLossUSD: number; maxTradesPerDay: number; breakAfterConsecutiveLosses: number; enforceBlocks: boolean }>(() => {
    try {
      const raw = localStorage.getItem('riskControls');
      if (raw) return JSON.parse(raw);
    } catch {}
    return { maxDailyLossUSD: 25, maxTradesPerDay: 4, breakAfterConsecutiveLosses: 3, enforceBlocks: false };
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      const savedSettings = localStorage.getItem('userSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed && typeof parsed === 'object') {
          setSettings(prev => ({ ...prev, ...parsed }));
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem('userSettings', JSON.stringify(settings));
      localStorage.setItem('riskControls', JSON.stringify(riskControls));

      // Apply theme immediately
      applyTheme(settings.theme);

      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const applyTheme = (theme: string) => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  };

  const updateSetting = (section: keyof UserSettings, key: string, value: any) => {
    setSettings(prev => {
      const next: UserSettings = {
        ...prev,
        [section]: typeof prev[section] === 'object' && prev[section] !== null
          ? { ...(prev[section] as Record<string, any>), [key]: value } as any
          : (value as any)
      } as UserSettings;

      // Persist immediately so other components reflect changes
      try { localStorage.setItem('userSettings', JSON.stringify(next)); } catch {}

      // Apply theme instantly when changed
      if (section === 'theme' && key === 'theme') {
        applyTheme(value as string);
      }

      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!loading && !user) {
    router.push('/login');
    return null;
  }

  return (
  <div className="min-h-screen bg-[#000000] text-[#FFFFFF]">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-[#FFFFFF]">Settings</h1>
          <p className="text-[#71767B]">Customize your trading experience</p>
        </div>

        <div className="space-y-6">
          {/* Trial status */}
          <TrialStatusCard />

          {/* Appearance Settings */}
          <div className="bg-[#15202B] rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Settings className="w-6 h-6" />
              Appearance
            </h2>

            <div className="space-y-6">
              {/* Theme */}
              <div>
                <label className="block text-sm font-medium mb-3">Theme</label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: 'light', label: 'Light', icon: Sun },
                    { value: 'dark', label: 'Dark', icon: Moon },
                    { value: 'system', label: 'System', icon: Settings }
                  ].map((theme) => {
                    const Icon = theme.icon;
                    return (
                      <button
                        key={theme.value}
                        onClick={() => updateSetting('theme', 'theme', theme.value)}
                        className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
                          settings.theme === theme.value
                            ? 'border-blue-500 bg-blue-600'
                            : 'border-gray-600 hover:border-gray-500'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{theme.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium mb-2">Language</label>
                <select
                  value={settings.language}
                  onChange={(e) => updateSetting('language', 'language', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="zh">中文</option>
                </select>
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-sm font-medium mb-2">Timezone</label>
                <select
                  value={settings.timezone}
                  onChange={(e) => updateSetting('timezone', 'timezone', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                  <option value="Africa/Lagos">West Africa (Lagos)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Market Preference Settings */}
          <div className="bg-[#15202B] rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Globe className="w-6 h-6" />
              Trading Markets
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-3">What do you trade?</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { value: 'forex', label: 'Forex', description: 'EUR/USD, GBP/JPY, etc.', icon: '💱' },
                    { value: 'crypto', label: 'Crypto', description: 'BTC/USDT, ETH/USDT, etc.', icon: '₿' },
                    { value: 'both', label: 'Both', description: 'All markets', icon: '🌐' }
                  ].map((market) => (
                    <button
                      key={market.value}
                      onClick={() => updateSetting('marketPreference', 'marketPreference', market.value)}
                      className={`flex flex-col items-start gap-2 p-4 rounded-lg border-2 transition-colors ${
                        settings.marketPreference === market.value
                          ? 'border-indigo-500 bg-indigo-600/20'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <div className="text-2xl">{market.icon}</div>
                      <div className="text-left">
                        <div className="font-semibold">{market.label}</div>
                        <div className="text-xs text-gray-400">{market.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  This helps us customize your dashboard, analytics, and AI recommendations.
                </p>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-[#15202B] rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Bell className="w-6 h-6" />
          Notifications
          </h2>

            <div className="space-y-4">
              {[
                { key: 'email', label: 'Email Notifications', description: 'Receive updates via email' },
                { key: 'push', label: 'Push Notifications', description: 'Browser notifications' },
                { key: 'tradeAlerts', label: 'Trade Alerts', description: 'Notifications for trade events' },
                { key: 'weeklyReports', label: 'Weekly Reports', description: 'Weekly performance summaries' }
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div>
                    <h3 className="font-medium">{item.label}</h3>
                    <p className="text-sm text-gray-400">{item.description}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(settings.notifications as any)[item.key]}
                      onChange={(e) => updateSetting('notifications', item.key, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="bg-[#15202B] rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Privacy & Analytics
          </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div>
                  <h3 className="font-medium">Analytics & Usage Data</h3>
                  <p className="text-sm text-gray-400">Help us improve by sharing anonymous usage data</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.privacy.analytics}
                    onChange={(e) => updateSetting('privacy', 'analytics', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Risk Controls */}
          <div className="bg-[#15202B] rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Risk Controls
            </h2>

            <FeatureLock requiredPlan={plan === 'free' ? 'plus' : undefined}>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Daily loss limit (USD)</label>
                  <input
                    type="number"
                    value={riskControls.maxDailyLossUSD}
                    onChange={(e)=> setRiskControls(prev => ({...prev, maxDailyLossUSD: Number(e.target.value)}))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Max trades per day</label>
                  <input
                    type="number"
                    value={riskControls.maxTradesPerDay}
                    onChange={(e)=> setRiskControls(prev => ({...prev, maxTradesPerDay: Number(e.target.value)}))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Break after consecutive losses</label>
                  <input
                    type="number"
                    value={riskControls.breakAfterConsecutiveLosses}
                    onChange={(e)=> setRiskControls(prev => ({...prev, breakAfterConsecutiveLosses: Number(e.target.value)}))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    id="enforceBlocks"
                    type="checkbox"
                    checked={riskControls.enforceBlocks}
                    onChange={(e)=> setRiskControls(prev => ({...prev, enforceBlocks: e.target.checked}))}
                    className="h-4 w-4"
                  />
                  <label htmlFor="enforceBlocks" className="text-sm text-gray-300">Strong warnings (Pro/Elite)</label>
                </div>
              </div>
              <div className="mt-4 text-xs text-gray-400">Risk Guard shows reminders or strong warnings when limits are hit. Adjust these to match your plan rules (e.g., prop-challenge risk).</div>
            </FeatureLock>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
