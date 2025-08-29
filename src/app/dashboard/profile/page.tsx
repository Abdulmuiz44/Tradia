// src/app/dashboard/profile/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  TrendingUp,
  Award,
  Edit3,
  Save,
  X,
  Upload,
  Camera,
  Globe,
  Briefcase,
  MessageSquare
} from "lucide-react";
import Spinner from "@/components/ui/spinner";

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  country: string | null;
  phone: string | null;
  bio: string | null;
  tradingStyle: string | null;
  tradingExperience: string | null;
  createdAt: string;
  updatedAt: string;
}

const TRADING_STYLES = [
  "Day Trading",
  "Swing Trading",
  "Position Trading",
  "Scalping",
  "Arbitrage",
  "News Trading",
  "Technical Analysis",
  "Fundamental Analysis",
  "Mixed Strategy"
];

const TRADING_EXPERIENCE = [
  "Beginner (0-1 year)",
  "Intermediate (1-3 years)",
  "Advanced (3-5 years)",
  "Expert (5+ years)",
  "Professional Trader"
];

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    country: "",
    phone: "",
    bio: "",
    tradingStyle: "",
    tradingExperience: ""
  });

  // Auto-detect country from IP
  const [detectingLocation, setDetectingLocation] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.push("/login");
      return;
    }

    fetchProfile();
  }, [session, status]);

  const fetchProfile = async () => {
    if (!session?.user?.email) return;

    try {
      setLoading(true);

      // First, try to get existing profile
      const { data: existingProfile, error: fetchError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("email", session.user.email)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error("Error fetching profile:", fetchError);
      }

      if (existingProfile) {
        setProfile(existingProfile);
        setFormData({
          name: existingProfile.name || "",
          country: existingProfile.country || "",
          phone: existingProfile.phone || "",
          bio: existingProfile.bio || "",
          tradingStyle: existingProfile.tradingStyle || "",
          tradingExperience: existingProfile.tradingExperience || ""
        });
      } else {
        // Create new profile with auto-detected data
        await createProfile();
      }
    } catch (error) {
      console.error("Error in fetchProfile:", error);
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async () => {
    if (!session?.user?.email) return;

    try {
      // Auto-detect country
      const country = await detectUserCountry();

      const newProfile = {
        email: session.user.email,
        name: session.user.name || null,
        image: session.user.image || null,
        country: country,
        phone: null,
        bio: null,
        tradingStyle: null,
        tradingExperience: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from("user_profiles")
        .insert(newProfile)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      setFormData({
        name: data.name || "",
        country: data.country || "",
        phone: data.phone || "",
        bio: data.bio || "",
        tradingStyle: data.tradingStyle || "",
        tradingExperience: data.tradingExperience || ""
      });
    } catch (error) {
      console.error("Error creating profile:", error);
    }
  };

  const detectUserCountry = async (): Promise<string> => {
    try {
      setDetectingLocation(true);
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      return data.country_name || "Unknown";
    } catch (error) {
      console.error("Error detecting country:", error);
      return "Unknown";
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !session?.user?.email) return;

    try {
      setUploadingAvatar(true);

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.email}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(filePath);

      // Update profile with new avatar
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({
          image: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq("email", session.user.email);

      if (updateError) throw updateError;

      // Update local state
      setProfile(prev => prev ? { ...prev, image: publicUrl } : null);

    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Failed to upload avatar. Please try again.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!session?.user?.email) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from("user_profiles")
        .update({
          name: formData.name || null,
          country: formData.country || null,
          phone: formData.phone || null,
          bio: formData.bio || null,
          tradingStyle: formData.tradingStyle || null,
          tradingExperience: formData.tradingExperience || null,
          updated_at: new Date().toISOString()
        })
        .eq("email", session.user.email);

      if (error) throw error;

      // Update local state
      setProfile(prev => prev ? {
        ...prev,
        ...formData,
        updatedAt: new Date().toISOString()
      } : null);

      setIsEditing(false);
      alert("Profile updated successfully!");

    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        country: profile.country || "",
        phone: profile.phone || "",
        bio: profile.bio || "",
        tradingStyle: profile.tradingStyle || "",
        tradingExperience: profile.tradingExperience || ""
      });
    }
    setIsEditing(false);
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p>Please sign in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Profile Settings</h1>
            <p className="text-gray-400">Manage your account information and trading preferences</p>
          </div>
          <div className="flex gap-3">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <Edit3 size={18} />
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg transition-colors"
                >
                  {saving ? <Spinner /> : <Save size={18} />}
                  Save Changes
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X size={18} />
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Overview */}
          <div className="lg:col-span-1">
            <div className="bg-[#161B22] rounded-lg p-6 border border-[#2a2f3a]">
              <div className="text-center">
                {/* Avatar */}
                <div className="relative mb-4">
                  <div className="w-24 h-24 mx-auto rounded-full overflow-hidden bg-gray-700 border-4 border-blue-600">
                    {profile?.image ? (
                      <img
                        src={profile.image}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User size={32} className="text-gray-400" />
                      </div>
                    )}
                  </div>

                  {isEditing && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="absolute bottom-0 right-1/2 transform translate-x-12 w-8 h-8 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition-colors"
                    >
                      {uploadingAvatar ? (
                        <Spinner />
                      ) : (
                        <Camera size={16} className="text-white" />
                      )}
                    </button>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>

                {/* Basic Info */}
                <h3 className="text-xl font-semibold mb-1">
                  {profile?.name || session.user.name || "Trader"}
                </h3>
                <p className="text-gray-400 text-sm mb-4">{profile?.email}</p>

                {/* Quick Stats */}
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-center gap-2 text-gray-300">
                    <Calendar size={16} />
                    <span>Joined {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Recently'}</span>
                  </div>

                  {profile?.country && (
                    <div className="flex items-center justify-center gap-2 text-gray-300">
                      <MapPin size={16} />
                      <span>{profile.country}</span>
                    </div>
                  )}

                  {profile?.tradingExperience && (
                    <div className="flex items-center justify-center gap-2 text-gray-300">
                      <Award size={16} />
                      <span>{profile.tradingExperience}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2">
            <div className="bg-[#161B22] rounded-lg border border-[#2a2f3a]">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-6">Account Information</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Mail size={16} className="inline mr-2" />
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profile?.email || ""}
                      disabled
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <User size={16} className="inline mr-2" />
                      Full Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your full name"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300">
                        {profile?.name || "Not set"}
                      </div>
                    )}
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Globe size={16} className="inline mr-2" />
                      Country
                      {detectingLocation && <span className="ml-2 text-xs text-blue-400">Detecting...</span>}
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your country"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300">
                        {profile?.country || "Not set"}
                      </div>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Phone size={16} className="inline mr-2" />
                      Phone Number
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your phone number"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300">
                        {profile?.phone || "Not set"}
                      </div>
                    )}
                  </div>

                  {/* Trading Style */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <TrendingUp size={16} className="inline mr-2" />
                      Trading Style
                    </label>
                    {isEditing ? (
                      <select
                        value={formData.tradingStyle}
                        onChange={(e) => setFormData(prev => ({ ...prev, tradingStyle: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select trading style</option>
                        {TRADING_STYLES.map(style => (
                          <option key={style} value={style}>{style}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300">
                        {profile?.tradingStyle || "Not set"}
                      </div>
                    )}
                  </div>

                  {/* Trading Experience */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Briefcase size={16} className="inline mr-2" />
                      Trading Experience
                    </label>
                    {isEditing ? (
                      <select
                        value={formData.tradingExperience}
                        onChange={(e) => setFormData(prev => ({ ...prev, tradingExperience: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select experience level</option>
                        {TRADING_EXPERIENCE.map(exp => (
                          <option key={exp} value={exp}>{exp}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300">
                        {profile?.tradingExperience || "Not set"}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bio */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <MessageSquare size={16} className="inline mr-2" />
                    Bio
                  </label>
                  {isEditing ? (
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Tell us about yourself and your trading journey..."
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 min-h-[100px]">
                      {profile?.bio || "No bio set"}
                    </div>
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
