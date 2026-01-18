// src/app/dashboard/profile/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Crown,
  TrendingUp,
  Clock,
  Target,
  BarChart3,
  Camera,
  Globe,
  FileText
} from "lucide-react";

const TRADING_STYLES = [
  { value: "scalper", label: "Scalper" },
  { value: "day_trader", label: "Day Trader" },
  { value: "swing_trader", label: "Swing Trader" },
  { value: "position_trader", label: "Position Trader" },
];

const EXPERIENCE_LEVELS = [
  { value: "beginner", label: "Beginner (0-1 year)" },
  { value: "intermediate", label: "Intermediate (1-3 years)" },
  { value: "advanced", label: "Advanced (3-5 years)" },
  { value: "expert", label: "Expert (5+ years)" },
];

const RISK_TOLERANCES = [
  { value: "conservative", label: "Conservative" },
  { value: "moderate", label: "Moderate" },
  { value: "aggressive", label: "Aggressive" },
];

const COMMON_TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "New York (EST/EDT)" },
  { value: "America/Chicago", label: "Chicago (CST/CDT)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST/PDT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
  { value: "Africa/Lagos", label: "Lagos (WAT)" },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, refreshUser } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    country: '',
    tradingStyle: '',
    experienceLevel: '',
    preferredPairs: '',
    riskTolerance: '',
    bio: '',
    profileImageUrl: '',
    timezone: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        country: user.country || '',
        tradingStyle: user.tradingStyle || '',
        experienceLevel: user.experienceLevel || '',
        preferredPairs: user.preferredPairs || '',
        riskTolerance: user.riskTolerance || '',
        bio: user.bio || '',
        profileImageUrl: user.profileImageUrl || user.image || '',
        timezone: user.timezone || '',
      });
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetch('/api/user/upload-avatar', {
        method: 'POST',
        body: formDataUpload,
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, profileImageUrl: data.url }));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

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
        const error = await response.json();
        alert(error.error || 'Failed to update profile');
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
        country: user.country || '',
        tradingStyle: user.tradingStyle || '',
        experienceLevel: user.experienceLevel || '',
        preferredPairs: user.preferredPairs || '',
        riskTolerance: user.riskTolerance || '',
        bio: user.bio || '',
        profileImageUrl: user.profileImageUrl || user.image || '',
        timezone: user.timezone || '',
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

  const getDisplayLabel = (value: string | undefined | null, options: { value: string; label: string }[]) => {
    if (!value) return 'Not set';
    return options.find(o => o.value === value)?.label || value;
  };

  const profileImage = formData.profileImageUrl || user.image || user.profileImageUrl;

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

      <div className="max-w-5xl mx-auto p-6">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">Profile</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your account information and trading preferences</p>
        </div>

        <div className="mb-6">
          <TrialStatusCard />
        </div>

        {/* Profile Header with Avatar */}
        <div className="bg-white dark:bg-[#161B22] rounded-lg border border-gray-200 dark:border-[#2a2f3a] p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Profile Image */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 border-4 border-white dark:border-[#2a2f3a] shadow-lg">
                {profileImage ? (
                  <Image
                    src={profileImage}
                    alt="Profile"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>
              {isEditing && (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition disabled:opacity-50"
                  >
                    {uploadingImage ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </button>
                </>
              )}
            </div>

            {/* Basic Info Display */}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name || 'Trader'}</h2>
              <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${planBadgeStyles[user.plan] ?? planBadgeStyles.starter}`}>
                  {user.plan.toUpperCase()} PLAN
                </span>
                {user.tradingStyle && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                    {getDisplayLabel(user.tradingStyle, TRADING_STYLES)}
                  </span>
                )}
                {user.experienceLevel && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                    {getDisplayLabel(user.experienceLevel, EXPERIENCE_LEVELS)}
                  </span>
                )}
              </div>
            </div>

            {/* Edit Button */}
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white dark:bg-[#161B22] rounded-lg border border-gray-200 dark:border-[#2a2f3a] p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5 text-blue-500" />
                Basic Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                {/* Timezone */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Timezone</label>
                  {isEditing ? (
                    <select
                      value={formData.timezone}
                      onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-[#0f1319] border border-gray-300 dark:border-[#2a2f3a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                    >
                      <option value="">Select timezone</option>
                      {COMMON_TIMEZONES.map(tz => (
                        <option key={tz.value} value={tz.value}>{tz.label}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0f1319] rounded-lg border border-gray-200 dark:border-[#2a2f3a]">
                      <Globe className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-900 dark:text-white">
                        {COMMON_TIMEZONES.find(tz => tz.value === user.timezone)?.label || user.timezone || 'Not set'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Email (read-only) */}
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
                </div>
              </div>
            </div>

            {/* Trading Profile */}
            <div className="bg-white dark:bg-[#161B22] rounded-lg border border-gray-200 dark:border-[#2a2f3a] p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Trading Profile
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Trading Style */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Trading Style</label>
                  {isEditing ? (
                    <select
                      value={formData.tradingStyle}
                      onChange={(e) => setFormData(prev => ({ ...prev, tradingStyle: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-[#0f1319] border border-gray-300 dark:border-[#2a2f3a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                    >
                      <option value="">Select trading style</option>
                      {TRADING_STYLES.map(style => (
                        <option key={style.value} value={style.value}>{style.label}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0f1319] rounded-lg border border-gray-200 dark:border-[#2a2f3a]">
                      <BarChart3 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-900 dark:text-white">{getDisplayLabel(user.tradingStyle, TRADING_STYLES)}</span>
                    </div>
                  )}
                </div>

                {/* Experience Level */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Experience Level</label>
                  {isEditing ? (
                    <select
                      value={formData.experienceLevel}
                      onChange={(e) => setFormData(prev => ({ ...prev, experienceLevel: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-[#0f1319] border border-gray-300 dark:border-[#2a2f3a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                    >
                      <option value="">Select experience level</option>
                      {EXPERIENCE_LEVELS.map(level => (
                        <option key={level.value} value={level.value}>{level.label}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0f1319] rounded-lg border border-gray-200 dark:border-[#2a2f3a]">
                      <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-900 dark:text-white">{getDisplayLabel(user.experienceLevel, EXPERIENCE_LEVELS)}</span>
                    </div>
                  )}
                </div>

                {/* Risk Tolerance */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Risk Tolerance</label>
                  {isEditing ? (
                    <select
                      value={formData.riskTolerance}
                      onChange={(e) => setFormData(prev => ({ ...prev, riskTolerance: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-[#0f1319] border border-gray-300 dark:border-[#2a2f3a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                    >
                      <option value="">Select risk tolerance</option>
                      {RISK_TOLERANCES.map(risk => (
                        <option key={risk.value} value={risk.value}>{risk.label}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0f1319] rounded-lg border border-gray-200 dark:border-[#2a2f3a]">
                      <Target className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-900 dark:text-white">{getDisplayLabel(user.riskTolerance, RISK_TOLERANCES)}</span>
                    </div>
                  )}
                </div>

                {/* Preferred Pairs */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Preferred Pairs</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.preferredPairs}
                      onChange={(e) => setFormData(prev => ({ ...prev, preferredPairs: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-[#0f1319] border border-gray-300 dark:border-[#2a2f3a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                      placeholder="e.g., EUR/USD, GBP/JPY"
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0f1319] rounded-lg border border-gray-200 dark:border-[#2a2f3a]">
                      <TrendingUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-900 dark:text-white">{user.preferredPairs || 'Not set'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bio */}
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Bio / About</label>
                {isEditing ? (
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 bg-white dark:bg-[#0f1319] border border-gray-300 dark:border-[#2a2f3a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white resize-none"
                    placeholder="Tell us about your trading journey..."
                  />
                ) : (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-[#0f1319] rounded-lg border border-gray-200 dark:border-[#2a2f3a] min-h-[80px]">
                    <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5" />
                    <span className="text-gray-900 dark:text-white">{user.bio || 'No bio provided'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Account Details */}
            <div className="bg-white dark:bg-[#161B22] rounded-lg border border-gray-200 dark:border-[#2a2f3a] p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-500" />
                Account Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Current Plan */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Current Plan</label>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0f1319] rounded-lg border border-gray-200 dark:border-[#2a2f3a]">
                    <CreditCard className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <span className="capitalize text-gray-900 dark:text-white">{user.plan} Plan</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${planBadgeStyles[user.plan] ?? planBadgeStyles.starter}`}>
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
              </div>
            </div>

            {/* Edit Actions */}
            {isEditing && (
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
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
                  className="flex items-center gap-2 px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Plan Management */}
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
                  <span className="text-sm text-gray-600 dark:text-gray-400">Profile Complete</span>
                  {user.tradingStyle && user.experienceLevel ? (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Complete
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-sm">
                      <Clock className="w-4 h-4" />
                      Incomplete
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
