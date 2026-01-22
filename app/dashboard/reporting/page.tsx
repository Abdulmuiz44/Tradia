"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import LayoutClient from '@/components/LayoutClient';
import { useTrade } from '@/context/TradeContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AnimatedDropdown from '@/components/ui/AnimatedDropdown';
import MobileBackButton from '@/components/ui/MobileBackButton';
import { User, Settings, FileText, Download, RefreshCw } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Components
import PerformanceSummaryCards from '@/components/dashboard/reporting/PerformanceSummaryCards';
import DetailedReportsSection from '@/components/dashboard/reporting/DetailedReportsSection';
import ExportCenter from '@/components/dashboard/reporting/ExportCenter';
import AIPerformanceInsights from '@/components/dashboard/reporting/AIPerformanceInsights';

function ReportingContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { accountFilteredTrades: trades, refreshTrades } = useTrade();
  const [refreshing, setRefreshing] = useState(false);
  const [userInitial, setUserInitial] = useState('U');

  useEffect(() => {
    if (session?.user?.email) {
      setUserInitial(session.user.email.trim()[0].toUpperCase());
    } else if (session?.user?.name) {
      setUserInitial(session.user.name.trim()[0].toUpperCase());
    }
  }, [session]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshTrades();
    } catch (error) {
      console.error('Failed to refresh trades:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false });
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      window.location.href = '/login';
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen w-full bg-white dark:bg-[#0D1117] transition-colors duration-300 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen w-full bg-white dark:bg-[#0D1117] transition-colors duration-300">
      <div className="flex h-screen">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-[#2a2f3a] bg-[#0D1117]">
            <div className="flex items-center gap-3">
              <MobileBackButton className="mr-2" />
              {/* User Avatar - visible on desktop */}
              <div className="hidden lg:block">
                <AnimatedDropdown
                  title="Account"
                  panelClassName="w-[95%] max-w-sm"
                  positionClassName="left-4 top-16"
                  trigger={
                    <button className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#0f1319] transition-colors" aria-label="Open account menu">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={session?.user?.image ?? ""} alt={session?.user?.name ?? session?.user?.email ?? "Profile"} />
                        <AvatarFallback className="bg-blue-600 text-white text-sm font-medium">{userInitial}</AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <p className="text-white text-sm font-medium truncate">
                          {session?.user?.name || session?.user?.email?.split('@')[0] || 'User'}
                        </p>
                        <p className="text-gray-400 text-xs truncate">
                          {session?.user?.email || ''}
                        </p>
                      </div>
                    </button>
                  }
                >
                  <div className="p-2">
                    <button
                      onClick={() => router.push("/dashboard/profile")}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-700 text-left"
                    >
                      <User className="w-4 h-4" />
                      <span>Profile</span>
                    </button>
                    <button
                      onClick={() => router.push("/dashboard/settings")}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-700 text-left"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-700 text-left text-red-400 hover:text-red-300"
                    >
                      <span>Sign Out</span>
                    </button>
                  </div>
                </AnimatedDropdown>
              </div>

              <div>
                <h1 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                  <FileText className="h-6 w-6" />
                  Performance Reports
                </h1>
                <p className="text-white text-xs sm:text-sm hidden sm:block">
                  Comprehensive trading performance analysis and exportable reports
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Generating...' : 'Generate New Report'}
              </button>

              {/* Mobile avatar - visible on mobile only */}
              <div className="lg:hidden">
                <AnimatedDropdown
                  title="Account"
                  panelClassName="w-[95%] max-w-sm"
                  trigger={
                    <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#0f1319] transition-colors" aria-label="Open account menu">
                      <Avatar className="w-8 h-8">
                        <AvatarImage
                          src={session?.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(session?.user?.name || session?.user?.email?.split('@')[0] || 'User')}&background=3b82f6&color=fff&size=32`}
                          alt={session?.user?.name || session?.user?.email?.split('@')[0] || 'Profile'}
                        />
                        <AvatarFallback className="bg-blue-600 text-white text-sm font-medium">{userInitial}</AvatarFallback>
                      </Avatar>
                    </button>
                  }
                >
                  <div className="p-2">
                    <button
                      onClick={() => router.push("/dashboard/profile")}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-700 text-left"
                    >
                      <User className="w-4 h-4" />
                      <span>Profile</span>
                    </button>
                    <button
                      onClick={() => router.push("/dashboard/settings")}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-700 text-left"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-700 text-left text-red-400 hover:text-red-300"
                    >
                      <span>Sign Out</span>
                    </button>
                  </div>
                </AnimatedDropdown>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 p-6">
              {/* Left Section - Performance Cards & Detailed Reports */}
              <div className="xl:col-span-3 space-y-6">
                {/* Performance Summary Cards */}
                <PerformanceSummaryCards trades={trades} />

                {/* Detailed Reports Section */}
                <DetailedReportsSection trades={trades} />

                {/* Export Center */}
                <ExportCenter trades={trades} />
              </div>

              {/* Right Section - AI Performance Insights */}
              <div className="xl:col-span-1">
                <AIPerformanceInsights trades={trades} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportingPage() {
  return (
    <LayoutClient>
      <ReportingContent />
    </LayoutClient>
  );
}
