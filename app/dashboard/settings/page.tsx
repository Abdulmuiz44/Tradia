"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { useSession } from "next-auth/react";
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Bell,
  Shield,
  Save,
  Loader2,
  Monitor,
  Globe
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import FeatureLock from "@/components/FeatureLock";
import TrialStatusCard from "@/components/TrialStatusCard";

interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
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
    theme: 'system',
    language: 'en',
    timezone: 'UTC',
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
  const [riskControls, setRiskControls] = useState<{ maxDailyLossUSD: number; maxTradesPerDay: number; breakAfterConsecutiveLosses: number; enforceBlocks: boolean }>({
    maxDailyLossUSD: 25,
    maxTradesPerDay: 4,
    breakAfterConsecutiveLosses: 3,
    enforceBlocks: false
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/user/settings');
      if (res.ok) {
        const data = await res.json();
        if (data?.settings) {
          // Merge defaults with loaded data to prevent missing keys
          setSettings(prev => ({
            ...prev,
            ...data.settings,
            notifications: { ...prev.notifications, ...(data.settings.notifications || {}) },
            privacy: { ...prev.privacy, ...(data.settings.privacy || {}) }
          }));
          if (data.settings.riskControls) {
            setRiskControls(prev => ({ ...prev, ...data.settings.riskControls }));
          }
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const payload = { ...settings, riskControls };
      await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: payload })
      });

      // Apply theme
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
      const next = { ...prev };
      if (section === 'theme' || section === 'language' || section === 'timezone') {
        (next as any)[section] = value;
      } else {
        (next as any)[section] = { ...(prev[section] as any), [key]: value };
      }

      if (section === 'theme' && key === 'theme') {
        applyTheme(value as string);
      }
      return next;
    });
  };

  if (loading) return null; // Or a skeleton

  return (
    <div className="space-y-8 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">Customize your trading experience and preference.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      <TrialStatusCard />

      <div className="grid gap-6">
        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><SettingsIcon className="w-5 h-5" /> Appearance</CardTitle>
            <CardDescription>Manage theme and locale preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label>Theme</Label>
                <div className="flex bg-muted p-1 rounded-lg w-max">
                  {[
                    { val: 'light', icon: Sun, label: 'Light' },
                    { val: 'dark', icon: Moon, label: 'Dark' },
                    { val: 'system', icon: Monitor, label: 'System' }
                  ].map((opt) => {
                    const Icon = opt.icon;
                    const active = settings.theme === opt.val;
                    return (
                      <button
                        key={opt.val}
                        onClick={() => updateSetting('theme', 'theme', opt.val)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all ${active ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        <Icon className="w-4 h-4" /> {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" /> Notifications</CardTitle>
            <CardDescription>Configure how you want to be alerted.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'email', label: 'Email Notifications', desc: 'Receive daily summaries and updates.' },
              { key: 'push', label: 'Push Notifications', desc: 'Real-time alerts for trade execs.' },
              { key: 'tradeAlerts', label: 'Trade Alerts', desc: 'Get notified on SL/TP hits.' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                <div className="space-y-0.5">
                  <Label className="text-base">{item.label}</Label>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={(settings.notifications as any)[item.key]}
                  onCheckedChange={(checked) => updateSetting('notifications', item.key, checked)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Risk Controls (Re-integrated from previous settings logic) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Global Risk Limits</CardTitle>
            <CardDescription>These limits apply to your main trading tracking.</CardDescription>
          </CardHeader>
          <CardContent>
            <FeatureLock requiredPlan={plan === 'starter' ? 'plus' : undefined}>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Max Daily Loss ($)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      className="pl-7"
                      value={riskControls.maxDailyLossUSD}
                      onChange={(e) => setRiskControls(prev => ({ ...prev, maxDailyLossUSD: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Max Trades / Day</Label>
                  <Input
                    type="number"
                    value={riskControls.maxTradesPerDay}
                    onChange={(e) => setRiskControls(prev => ({ ...prev, maxTradesPerDay: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Strict Mode</Label>
                  <div className="flex items-center gap-3 border p-3 rounded-lg">
                    <Switch
                      checked={riskControls.enforceBlocks}
                      onCheckedChange={(checked) => setRiskControls(prev => ({ ...prev, enforceBlocks: checked }))}
                    />
                    <span className="text-sm">Enforce Blocks?</span>
                  </div>
                </div>
              </div>
            </FeatureLock>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
