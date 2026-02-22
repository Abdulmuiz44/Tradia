"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import LayoutClient from '@/components/LayoutClient';
import { useTrade } from '@/context/TradeContext';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DashboardHeader from "@/components/dashboard/DashboardHeader";

// Components
import PerformanceSummaryCards from '@/components/dashboard/reporting/PerformanceSummaryCards';
import DetailedReportsSection from '@/components/dashboard/reporting/DetailedReportsSection';
import ExportCenter from '@/components/dashboard/reporting/ExportCenter';
import AIPerformanceInsights from '@/components/dashboard/reporting/AIPerformanceInsights';

function ReportingContent() {
  const { status } = useSession();
  const { accountFilteredTrades: trades, refreshTrades } = useTrade();
  const [refreshing, setRefreshing] = useState(false);

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

  if (status === 'loading') {
    return (
      <div className="min-h-screen w-full bg-white dark:bg-[#0D1117] transition-colors duration-300 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white dark:bg-[#0D1117] transition-colors duration-300">
      <div className="flex h-screen">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <DashboardHeader
            title="Performance Reports"
            description="Comprehensive trading performance analysis and exportable reports"
            showBackButton
            actions={
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Generating...' : 'Generate New Report'}
              </Button>
            }
          />

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
