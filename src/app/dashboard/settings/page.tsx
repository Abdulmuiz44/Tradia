// src/app/dashboard/settings/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Settings,
  Moon,
  Sun,
  Bell,
  Shield,
  Globe,
  Save,
  RefreshCw,
  Palette,
  Volume2,
  VolumeX
} from "lucide-react";

interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    tradeAlerts: boolean;
    weeklyReports: boolean;
    marketing: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'friends';
    dataSharing: boolean;
    analytics: boolean;
  };
  trading: {
    defaultTimeframe: string;
    riskPerTrade: number;
    maxDailyLoss: number;
    autoSaveTrades: boolean;
  };
  sound: {
    enabled: boolean;
    tradeAlerts: boolean;
    notifications: boolean;
  };
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [settings, setSettings] = useState<UserSettings>({
    theme: 'dark',
    language: 'en',
    timezone: 'UTC',
    notifications: {
      email: true,
      push: true,
      tradeAlerts: true,
      weeklyReports: true,
      marketing: false
    },
    privacy: {
      profileVisibility: 'private',
      dataSharing: false,
      analytics: true
    },
    trading: {
      defaultTimeframe: '1h',
      riskPerTrade: 1,
      maxDailyLoss: 100,
      autoSaveTrades: true
    },
    sound: {
      enabled: true,
      tradeAlerts: true,
      notifications: false
    }
  });

  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'appearance' | 'notifications' | 'privacy' | 'trading' | 'sound'>('appearance');

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
      // Reset to defaults if loading fails
      setSettings(prev => ({ ...prev }));
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem('userSettings', JSON.stringify(settings));

      // Apply theme immediately
      applyTheme(settings.theme);

      // TODO: Save to server
      // await fetch('/api/user/settings', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(settings)
      // });

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
    setSettings(prev => ({
      ...prev,
      [section]: typeof prev[section] === 'object' && prev[section] !== null
        ? { ...(prev[section] as Record<string, any>), [key]: value }
        : value
    }));
  };

  const updateNestedSetting = (section: keyof UserSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as Record<string, any>),
        [key]: value
      }
    }));
  };

  if (!session?.user) {
    router.push('/login');
    return null;
  }

  const sections = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'trading', label: 'Trading', icon: Settings },
    { id: 'sound', label: 'Sound', icon: Volume2 }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-gray-400">Customize your trading experience</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-4">
              <nav className="space-y-2">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id as any)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeSection === section.id
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {section.label}
                    </button>
                  );
                })}
              </nav>

              {/* Save Button */}
              <div className="mt-6 pt-4 border-t border-gray-700">
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="w-full flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-gray-800 rounded-lg p-6">
              {activeSection === 'appearance' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Palette className="w-6 h-6" />
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
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'notifications' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Bell className="w-6 h-6" />
                    Notifications
                  </h2>

                  <div className="space-y-4">
                    {[
                      { key: 'email', label: 'Email Notifications', description: 'Receive updates via email' },
                      { key: 'push', label: 'Push Notifications', description: 'Browser notifications' },
                      { key: 'tradeAlerts', label: 'Trade Alerts', description: 'Notifications for trade events' },
                      { key: 'weeklyReports', label: 'Weekly Reports', description: 'Weekly performance summaries' },
                      { key: 'marketing', label: 'Marketing Communications', description: 'Product updates and offers' }
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
                            onChange={(e) => updateNestedSetting('notifications', item.key, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === 'privacy' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Shield className="w-6 h-6" />
                    Privacy & Security
                  </h2>

                  <div className="space-y-6">
                    {/* Profile Visibility */}
                    <div>
                      <label className="block text-sm font-medium mb-3">Profile Visibility</label>
                      <div className="space-y-2">
                        {[
                          { value: 'public', label: 'Public', description: 'Anyone can see your profile' },
                          { value: 'private', label: 'Private', description: 'Only you can see your profile' },
                          { value: 'friends', label: 'Friends Only', description: 'Only approved connections can see' }
                        ].map((option) => (
                          <label key={option.value} className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg cursor-pointer">
                            <input
                              type="radio"
                              name="profileVisibility"
                              value={option.value}
                              checked={settings.privacy.profileVisibility === option.value}
                              onChange={(e) => updateNestedSetting('privacy', 'profileVisibility', e.target.value)}
                              className="text-blue-600"
                            />
                            <div>
                              <div className="font-medium">{option.label}</div>
                              <div className="text-sm text-gray-400">{option.description}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Data Sharing */}
                    <div className="space-y-4">
                      {[
                        { key: 'dataSharing', label: 'Data Sharing', description: 'Share anonymized data to improve our services' },
                        { key: 'analytics', label: 'Analytics', description: 'Help us improve by sharing usage analytics' }
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                          <div>
                            <h3 className="font-medium">{item.label}</h3>
                            <p className="text-sm text-gray-400">{item.description}</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={(settings.privacy as any)[item.key]}
                              onChange={(e) => updateNestedSetting('privacy', item.key, e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'trading' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Settings className="w-6 h-6" />
                    Trading Preferences
                  </h2>

                  <div className="space-y-6">
                    {/* Default Timeframe */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Default Timeframe</label>
                      <select
                        value={settings.trading.defaultTimeframe}
                        onChange={(e) => updateNestedSetting('trading', 'defaultTimeframe', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="1m">1 Minute</option>
                        <option value="5m">5 Minutes</option>
                        <option value="15m">15 Minutes</option>
                        <option value="1h">1 Hour</option>
                        <option value="4h">4 Hours</option>
                        <option value="1d">Daily</option>
                      </select>
                    </div>

                    {/* Risk Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">Risk Per Trade (%)</label>
                        <input
                          type="number"
                          min="0.1"
                          max="10"
                          step="0.1"
                          value={settings.trading.riskPerTrade}
                          onChange={(e) => updateNestedSetting('trading', 'riskPerTrade', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Max Daily Loss ($)</label>
                        <input
                          type="number"
                          min="10"
                          max="10000"
                          step="10"
                          value={settings.trading.maxDailyLoss}
                          onChange={(e) => updateNestedSetting('trading', 'maxDailyLoss', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Auto Save */}
                    <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                      <div>
                        <h3 className="font-medium">Auto-save Trades</h3>
                        <p className="text-sm text-gray-400">Automatically save trades as you enter them</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.trading.autoSaveTrades}
                          onChange={(e) => updateNestedSetting('trading', 'autoSaveTrades', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'sound' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Volume2 className="w-6 h-6" />
                    Sound Settings
                  </h2>

                  <div className="space-y-6">
                    {/* Master Sound Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                      <div>
                        <h3 className="font-medium">Enable Sound</h3>
                        <p className="text-sm text-gray-400">Turn on/off all sound notifications</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.sound.enabled}
                          onChange={(e) => updateNestedSetting('sound', 'enabled', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {/* Individual Sound Settings */}
                    {settings.sound.enabled && (
                      <div className="space-y-4">
                        {[
                          { key: 'tradeAlerts', label: 'Trade Alerts', description: 'Sound when trades are executed' },
                          { key: 'notifications', label: 'Notifications', description: 'Sound for general notifications' }
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                            <div>
                              <h3 className="font-medium">{item.label}</h3>
                              <p className="text-sm text-gray-400">{item.description}</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={(settings.sound as any)[item.key]}
                                onChange={(e) => updateNestedSetting('sound', item.key, e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
