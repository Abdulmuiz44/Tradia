// src/app/dashboard/profile/page.tsx
"use client";

import React, { useState, useEffect } from "react";
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
  X
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Profile</h1>
          <p className="text-gray-400">Manage your account information</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Overview */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Account Information</h2>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit Profile
                  </button>
                )}
              </div>

              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg">
                      <User className="w-5 h-5 text-gray-400" />
                      <span>{user.name || 'Not provided'}</span>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium mb-2">Email Address</label>
                  <div className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <span>{user.email}</span>
                    {user.emailVerified ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {user.emailVerified ? 'Email verified' : 'Email not verified'}
                  </p>
                </div>

                {/* Country */}
                <div>
                  <label className="block text-sm font-medium mb-2">Country</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your country"
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg">
                      <MapPin className="w-5 h-5 text-gray-400" />
                      <span>{user.country || 'Not provided'}</span>
                    </div>
                  )}
                </div>

                {/* Current Plan */}
                <div>
                  <label className="block text-sm font-medium mb-2">Current Plan</label>
                  <div className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg">
                    <CreditCard className="w-5 h-5 text-gray-400" />
                    <span className="capitalize">{user.plan} Plan</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      user.plan === 'free' ? 'bg-gray-600' :
                      user.plan === 'pro' ? 'bg-blue-600' :
                      user.plan === 'plus' ? 'bg-purple-600' :
                      'bg-yellow-600'
                    }`}>
                      {user.plan.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Account Created */}
                <div>
                  <label className="block text-sm font-medium mb-2">Account Created</label>
                  <div className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <span>{formatDate(user.createdAt)}</span>
                  </div>
                </div>

                {/* Last Login */}
                {user.lastLogin && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Last Login</label>
                    <div className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg">
                      <Shield className="w-5 h-5 text-gray-400" />
                      <span>{formatDate(user.lastLogin)}</span>
                    </div>
                  </div>
                )}

                {/* Edit Actions */}
                {isEditing && (
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
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
                      className="flex items-center gap-2 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
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
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Plan Management</h3>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/pricing')}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  View Plans & Upgrade
                </button>
                <button
                  onClick={() => router.push('/dashboard/billing')}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                >
                  Billing History
                </button>
              </div>
            </div>

            {/* Account Status */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Account Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Email Verification</span>
                  {user.emailVerified ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Account Active</span>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Trader Status</span>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}