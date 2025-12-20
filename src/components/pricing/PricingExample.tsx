import React, { useState } from 'react';
import { PricingPage } from './PricingPage';
import { UsageDashboard } from './UsageDashboard';
import { UpgradeModal } from './UpgradeModal';
import { PlanType } from '@/lib/planAccess';

// Example component showing how to use the pricing components
export const PricingExample: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'ai-limit' | 'file-limit' | 'export-limit' | 'general'>('general');

  // Mock current user data - replace with actual user context
  const currentPlan: PlanType = 'starter';
  const usageStats = {
    messages: 3, // Used 3 out of 5 for starter plan
    uploads: 0,
  };

  const handleSelectPlan = (plan: PlanType) => {
    setSelectedPlan(plan);
    // Here you would typically redirect to payment processing
    console.log(`Selected plan: ${plan}`);
    alert(`Upgrade to ${plan} initiated! (This would normally redirect to payment)`);
  };

  const handleShowUpgradeModal = (reason: typeof upgradeReason) => {
    setUpgradeReason(reason);
    setIsUpgradeModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Usage Dashboard - shows current limits */}
      <div className="max-w-4xl mx-auto py-8 px-4">
        <UsageDashboard
          currentPlan={currentPlan}
          usageStats={usageStats}
          className="mb-8"
        />

        {/* Demo buttons to trigger upgrade modals */}
        <div className="mb-8 p-4 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Demo: Trigger Upgrade Modals</h3>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => handleShowUpgradeModal('ai-limit')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              AI Chat Limit Reached
            </button>
            <button
              onClick={() => handleShowUpgradeModal('file-limit')}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              File Upload Limit
            </button>
            <button
              onClick={() => handleShowUpgradeModal('export-limit')}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Export Feature
            </button>
            <button
              onClick={() => handleShowUpgradeModal('general')}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              General Upgrade
            </button>
          </div>
        </div>
      </div>

      {/* Main Pricing Page */}
      <PricingPage
        onSelectPlan={handleSelectPlan}
        highlightAI={true}
      />

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        currentPlan={currentPlan}
        reason={upgradeReason}
        onSelectPlan={(plan) => {
          setIsUpgradeModalOpen(false);
          handleSelectPlan(plan);
        }}
      />
    </div>
  );
};
