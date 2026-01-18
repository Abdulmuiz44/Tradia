// src/app/dashboard/profile/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import TrialStatusCard from "@/components/TrialStatusCard";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import {
  User,
  Mail,
  MapPin,
  Calendar,
  Shield,
  CreditCard,
  CheckCircle,
  XCircle,
  Edit3,
  Save,
  X,
  Crown
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, refreshUser } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    country: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        country: user.country || ''
      });
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  const handleSave = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const response = await fetch('/api/user/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await refreshUser();
        setIsEditing(false);
        alert('Profile updated successfully!');
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

  const handleCancel = () => {
    if (user) {
      setFormData({
        name: user.name || '',
        country: user.country || ''
      });
    }
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#0f1319]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0f1319] text-gray-900 dark:text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Redirecting to login…</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) {
      return 'Not available';
    }
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const planBadgeStyles: Record<string, string> = {
    free: 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200',
    starter: 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200',
    pro: 'bg-blue-100 dark:bg-blue-600 text-blue-800 dark:text-blue-100',
    plus: 'bg-purple-100 dark:bg-purple-600 text-purple-800 dark:text-purple-100',
    elite: 'bg-emerald-100 dark:bg-emerald-600 text-emerald-800 dark:text-emerald-100'
  };

  const lastLogin = (user as { lastLogin?: string | null }).lastLogin ?? null;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f1319] text-gray-900 dark:text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 h-[60px] border-b border-gray-200 dark:border-[#2a2f3a] bg-white/95 dark:bg-[#0f1319]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/TRADIA-LOGO.png"
                alt="Tradia logo"
                width={36}
                height={36}
                className="h-9 w-auto select-none"
                priority
              />
              <div className="leading-tight">
                <p className="text-sm font-semibold tracking-tight text-gray-900 dark:text-white">Dashboard</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Manage your trading account</p>
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <button
              onClick={() => router.push('/chat')}
              className="h-9 rounded-lg bg-black dark:bg-white px-8 text-xs font-semibold text-white dark:text-black shadow-sm transition hover:bg-gray-800 dark:hover:bg-gray-100"
            >
              AI Chat
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">Profile</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your account information</p>
        </div>

        <div className="mb-6">
          <TrialStatusCard />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Overview */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-[#161B22] rounded-lg border border-gray-200 dark:border-[#2a2f3a] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Account Information</h2>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit Profile
                  </button>
                )}
              </div>

              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-[#0f1319] border border-gray-300 dark:border-[#2a2f3a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0f1319] rounded-lg border border-gray-200 dark:border-[#2a2f3a]">
                      <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-900 dark:text-white">{user.name || 'Not provided'}</span>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Email Address</label>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0f1319] rounded-lg border border-gray-200 dark:border-[#2a2f3a]">
                    <Mail className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-900 dark:text-white flex-1">{user.email}</span>
                    {user.emailVerified ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {user.emailVerified ? 'Email verified' : 'Email not verified'}
                  </p>
                </div>

                {/* Country */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Country</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-[#0f1319] border border-gray-300 dark:border-[#2a2f3a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                      placeholder="Enter your country"
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0f1319] rounded-lg border border-gray-200 dark:border-[#2a2f3a]">
                      <MapPin className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-900 dark:text-white">{user.country || 'Not provided'}</span>
                    </div>
                  )}
                </div>

                {/* Current Plan */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Current Plan</label>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0f1319] rounded-lg border border-gray-200 dark:border-[#2a2f3a]">
                    <CreditCard className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <span className="capitalize text-gray-900 dark:text-white">{user.plan} Plan</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${planBadgeStyles[user.plan] ?? planBadgeStyles.free}`}>
                      {user.plan.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Account Created */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Account Created</label>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0f1319] rounded-lg border border-gray-200 dark:border-[#2a2f3a]">
                    <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-900 dark:text-white">{formatDate(user.createdAt)}</span>
                  </div>
                </div>

                {/* Last Login */}
                {lastLogin && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Last Login</label>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0f1319] rounded-lg border border-gray-200 dark:border-[#2a2f3a]">
                      <Shield className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-900 dark:text-white">{formatDate(lastLogin)}</span>
                    </div>
                  </div>
                )}

                {/* Edit Actions */}
                {isEditing && (
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
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
                    <button
                      onClick={handleCancel}
                      className="flex items-center gap-2 px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            {/* Plan Upgrade */}
            <div className="bg-white dark:bg-[#161B22] rounded-lg border border-gray-200 dark:border-[#2a2f3a] p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                Plan Management
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/dashboard/upgrade')}
                  className="w-full px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 font-medium transition"
                >
                  View Plans & Upgrade
                </button>
                <button
                  onClick={() => router.push('/dashboard/billing')}
                  className="w-full px-4 py-2.5 bg-gray-100 dark:bg-[#0f1319] text-gray-800 dark:text-white border border-gray-300 dark:border-[#2a2f3a] rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition"
                >
                  Billing History
                </button>
              </div>
            </div>

            {/* Account Status */}
            <div className="bg-white dark:bg-[#161B22] rounded-lg border border-gray-200 dark:border-[#2a2f3a] p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Account Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Email Verification</span>
                  {user.emailVerified ? (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400 text-sm">
                      <XCircle className="w-4 h-4" />
                      Not Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Account Active</span>
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Trader Status</span>
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

