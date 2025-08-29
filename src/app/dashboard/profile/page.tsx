// src/app/dashboard/profile/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Camera,
  Save,
  Key,
  CreditCard,
  Settings,
  Shield,
  Bell,
  Moon,
  Sun,
  Globe,
  Upload,
  X
} from "lucide-react";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  createdAt: string;
  lastLogin: string;
}

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'billing' | 'settings'>('profile');

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Settings states
  const [settings, setSettings] = useState({
    theme: 'dark',
    language: 'en',
    notifications: true,
    emailUpdates: true,
    tradeAlerts: true
  });

  useEffect(() => {
    if (session?.user) {
      loadUserProfile();
      loadUserSettings();
    }
  }, [session]);

  const loadUserProfile = async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        setFormData({
          name: data.profile.name || '',
          email: data.profile.email
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserSettings = () => {
    // Load user settings from localStorage or default values
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Failed to parse settings:', error);
      }
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    setSaving(true);
    try {
      const response = await fetch('/api/user/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        // Update session
        if (session && update) {
          await update({
            ...session,
            user: {
              ...session.user,
              name: formData.name,
              email: formData.email
            }
          });
        }

        alert('Profile updated successfully!');
        loadUserProfile();
      } else {
        alert('Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      if (response.ok) {
        alert('Password changed successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      alert('Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingsUpdate = (newSettings: Partial<typeof settings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    localStorage.setItem('userSettings', JSON.stringify(updatedSettings));

    // Apply theme immediately
    if (newSettings.theme) {
      document.documentElement.classList.toggle('dark', newSettings.theme === 'dark');
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append('avatar', file);

    try {
      const response = await fetch('/api/user/upload-avatar', {
        method: 'POST',
        body: formDataUpload
      });

      if (response.ok) {
        const data = await response.json();
        // Update session with new avatar
        if (session && update) {
          await update({
            ...session,
            user: {
              ...session.user,
              image: data.avatarUrl
            }
          });
        }
        alert('Avatar updated successfully!');
        loadUserProfile();
      } else {
        alert('Failed to upload avatar');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      alert('Failed to upload avatar');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!session?.user) {
    router.push('/login');
    return null;
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
          <p className="text-gray-400">Manage your account information and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-4">
              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-gray-800 rounded-lg p-6">
              {activeTab === 'profile' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Profile Information</h2>

                  {/* Avatar Section */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4">Profile Picture</h3>
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <img
                          src={profile?.image || '/default-avatar.png'}
                          alt="Profile"
                          className="w-24 h-24 rounded-full object-cover"
                        />
                        <label className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full cursor-pointer hover:bg-blue-700">
                          <Camera className="w-4 h-4" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleAvatarUpload(file);
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-2">
                          Upload a new profile picture. Max size: 5MB
                        </p>
                        <p className="text-xs text-gray-500">
                          Supported formats: JPG, PNG, GIF
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Profile Form */}
                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">Full Name</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your full name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Email Address</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your email"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'security' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Security Settings</h2>

                  {/* Password Change Form */}
                  <div className="bg-gray-700 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Key className="w-5 h-5" />
                      Change Password
                    </h3>

                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Current Password</label>
                        <input
                          type="password"
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">New Password</label>
                        <input
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          minLength={8}
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Must be at least 8 characters long
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                        <input
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Updating...
                          </>
                        ) : (
                          <>
                            <Key className="w-4 h-4" />
                            Update Password
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {activeTab === 'billing' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Billing & Subscription</h2>

                  {/* Current Plan */}
                  <div className="bg-gray-700 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-semibold mb-4">Current Plan</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-blue-400">Free Plan</p>
                        <p className="text-gray-400">Basic features included</p>
                      </div>
                      <button
                        onClick={() => router.push('/pricing')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Upgrade Plan
                      </button>
                    </div>
                  </div>

                  {/* Usage Stats */}
                  <div className="bg-gray-700 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Usage This Month</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-400">0/5</p>
                        <p className="text-sm text-gray-400">AI Chats</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-400">0</p>
                        <p className="text-sm text-gray-400">MT5 Accounts</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-400">0</p>
                        <p className="text-sm text-gray-400">Trades Stored</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Preferences</h2>

                  <div className="space-y-6">
                    {/* Theme Setting */}
                    <div className="bg-gray-700 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Appearance
                      </h3>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Theme</label>
                          <div className="flex gap-4">
                            <button
                              onClick={() => handleSettingsUpdate({ theme: 'light' })}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                                settings.theme === 'light'
                                  ? 'border-blue-500 bg-blue-600'
                                  : 'border-gray-600 hover:border-gray-500'
                              }`}
                            >
                              <Sun className="w-4 h-4" />
                              Light
                            </button>
                            <button
                              onClick={() => handleSettingsUpdate({ theme: 'dark' })}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                                settings.theme === 'dark'
                                  ? 'border-blue-500 bg-blue-600'
                                  : 'border-gray-600 hover:border-gray-500'
                              }`}
                            >
                              <Moon className="w-4 h-4" />
                              Dark
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Notification Settings */}
                    <div className="bg-gray-700 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Bell className="w-5 h-5" />
                        Notifications
                      </h3>

                      <div className="space-y-4">
                        <label className="flex items-center justify-between">
                          <span>Email Updates</span>
                          <input
                            type="checkbox"
                            checked={settings.emailUpdates}
                            onChange={(e) => handleSettingsUpdate({ emailUpdates: e.target.checked })}
                            className="rounded"
                          />
                        </label>

                        <label className="flex items-center justify-between">
                          <span>Trade Alerts</span>
                          <input
                            type="checkbox"
                            checked={settings.tradeAlerts}
                            onChange={(e) => handleSettingsUpdate({ tradeAlerts: e.target.checked })}
                            className="rounded"
                          />
                        </label>

                        <label className="flex items-center justify-between">
                          <span>Push Notifications</span>
                          <input
                            type="checkbox"
                            checked={settings.notifications}
                            onChange={(e) => handleSettingsUpdate({ notifications: e.target.checked })}
                            className="rounded"
                          />
                        </label>
                      </div>
                    </div>
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
