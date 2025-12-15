"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import LayoutClient from '@/components/LayoutClient';
import { TradeProvider, useTrade } from '@/context/TradeContext';
import { UserProvider } from '@/context/UserContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AnimatedDropdown from '@/components/ui/AnimatedDropdown';
import MobileBackButton from '@/components/ui/MobileBackButton';
import { User, Settings, RefreshCw } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Import components directly for now
import MarketOverview from '@/components/tradia-predict/MarketOverview';
import TradePredictor from '@/components/tradia-predict/TradePredictor';
import RiskAnalyzer from '@/components/tradia-predict/RiskAnalyzer';
import PortfolioOptimizer from '@/components/tradia-predict/PortfolioOptimizer';
import PatternRecognition from '@/components/tradia-predict/PatternRecognition';
import MarketAlerts from '@/components/tradia-predict/MarketAlerts';



type TabType = 'overview' | 'trade-prediction' | 'risk-analysis' | 'portfolio' | 'patterns' | 'alerts';

const tabs: { id: TabType; label: string; icon: string; description: string }[] = [
  {
    id: 'overview',
    label: 'Market Overview',
    icon: 'BarChart3',
    description: 'Real-time market sentiment and trending analysis'
  },
  {
    id: 'trade-prediction',
    label: 'Trade Prediction',
    icon: 'TrendingUp',
    description: 'AI-powered predictions based on your trading history'
  },
  {
    id: 'risk-analysis',
    label: 'Risk Analysis',
    icon: 'Shield',
    description: 'Comprehensive risk assessment and optimization'
  },
  {
    id: 'portfolio',
    label: 'Portfolio Optimizer',
    icon: 'Target',
    description: 'Optimal position sizing and asset allocation'
  },
  {
    id: 'patterns',
    label: 'Pattern Recognition',
    icon: 'Search',
    description: 'Identify successful trading patterns in your history'
  },
  {
    id: 'alerts',
    label: 'Market Alerts',
    icon: 'Bell',
    description: 'Real-time market condition notifications'
  }
];

function TradiaPredictContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { trades, refreshTrades } = useTrade();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <MarketOverview />;
      case 'trade-prediction':
        return <TradePredictor trades={trades} />;
      case 'risk-analysis':
        return <RiskAnalyzer trades={trades} />;
      case 'portfolio':
        return <PortfolioOptimizer trades={trades} />;
      case 'patterns':
        return <PatternRecognition trades={trades} />;
      case 'alerts':
        return <MarketAlerts />;
      default:
        return <MarketOverview />;
    }
  };

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <div className="min-h-screen w-full bg-white dark:bg-[#0D1117] transition-colors duration-300">
      <div className="flex h-screen">
        {/* Mobile Sidebar Overlay */}
        <div className={`fixed inset-0 z-40 lg:hidden ${mobileMenuOpen ? 'block' : 'hidden'}`}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-[#161B22] border-r border-[#2a2f3a]">
            <div className="flex items-center justify-between p-4 border-b border-[#2a2f3a]">
              <div className="flex items-center gap-3">
                <Image
                  src="/Tradia-logo-ONLY.png"
                  alt="Tradia logo"
                  width={28}
                  height={28}
                  className="h-7 w-auto"
                  priority
                />
                <h1 className="text-white font-extrabold text-lg">Tradia</h1>
              </div>
            </div>
            <div className="p-4">
              <nav className="space-y-2">
                <a href="/dashboard" className="block px-3 py-2 text-gray-300 hover:bg-gray-700 rounded">
                  Dashboard
                </a>
                <a href="/chat" className="block px-3 py-2 text-gray-300 hover:bg-gray-700 rounded">
                Tradia AI
                </a>
                <a href="/tradia-predict" className="block px-3 py-2 bg-blue-600 text-white rounded">
                  Tradia Predict
                </a>
              </nav>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-[#2a2f3a] bg-[#0D1117]">
            <div className="flex items-center gap-3">
              {/* Mobile menu button */}
              <button
                className="lg:hidden p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open Menu"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* User Avatar - visible on desktop, hidden on mobile */}
              <div className="hidden lg:block">
                <AnimatedDropdown
                  title="Account"
                  panelClassName="w-[95%] max-w-sm"
                  positionClassName="left-4 top-16"
                  trigger={
                    <button className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors" aria-label="Open account menu">
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

              {/* Page title - adjusted for mobile */}
              <div>
                <h1 className="text-lg md:text-xl font-bold text-white">Tradia Predict</h1>
                <p className="text-white text-xs sm:text-sm hidden sm:block">
                  {activeTabData?.description || 'Advanced AI-powered trading predictions'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Refresh button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                title="Refresh data"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>

              {/* Mobile avatar - visible on mobile only */}
              <div className="lg:hidden">
                <AnimatedDropdown
                  title="Account"
                  panelClassName="w-[95%] max-w-sm"
                  trigger={
                    <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800 transition-colors" aria-label="Open account menu">
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

          {/* Tab Navigation */}
          <div className="border-b border-[#2a2f3a] bg-[#0D1117]">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <span className="text-lg">{getTabIcon(tab.icon)}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

function getTabIcon(iconName: string) {
  const icons: Record<string, string> = {
    BarChart3: '📊',
    TrendingUp: '📈',
    Shield: '🛡️',
    Target: '🎯',
    Search: '🔍',
    Bell: '🔔'
  };
  return icons[iconName] || '📊';
}

export default function TradiaPredictPage() {
  return (
    <LayoutClient>
      <UserProvider>
        <TradeProvider>
          <TradiaPredictContent />
        </TradeProvider>
      </UserProvider>
    </LayoutClient>
  );
}
