import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Zap, MessageSquare, FileText, Download, Infinity } from 'lucide-react';
import { PlanType, getUpgradeOptions, PLAN_LIMITS } from '@/lib/planAccess';
import { normalizePlanType } from '@/lib/planAccess';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: PlanType;
  reason?: 'ai-limit' | 'file-limit' | 'export-limit' | 'general';
  onSelectPlan?: (plan: PlanType) => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  currentPlan,
  reason = 'general',
  onSelectPlan,
}) => {
  const upgradeOptions = getUpgradeOptions(currentPlan);

  const getReasonContent = () => {
    switch (reason) {
      case 'ai-limit':
        return {
          icon: <MessageSquare className="w-6 h-6 text-blue-500" />,
          title: 'AI Chat Limit Reached',
          description: `You've used all ${PLAN_LIMITS[currentPlan].aiChatsPerDay} AI chats for today. Upgrade to continue chatting with our AI assistant.`,
        };
      case 'file-limit':
        return {
          icon: <FileText className="w-6 h-6 text-green-500" />,
          title: 'File Upload Limit Reached',
          description: 'Upgrade to upload more trade screenshots and analysis files.',
        };
      case 'export-limit':
        return {
          icon: <Download className="w-6 h-6 text-purple-500" />,
          title: 'Export Feature Unlocked',
          description: 'Upgrade to export your trading data and AI conversations.',
        };
      default:
        return {
          icon: <Crown className="w-6 h-6 text-yellow-500" />,
          title: 'Unlock Premium Features',
          description: 'Upgrade to access advanced trading tools and unlimited AI assistance.',
        };
    }
  };

  const reasonContent = getReasonContent();

  const getPlanIcon = (plan: string) => {
    if (plan.toLowerCase().includes('plus') || plan.toLowerCase().includes('elite')) {
      return <Crown className="w-4 h-4 text-yellow-500" />;
    }
    if (plan.toLowerCase().includes('pro')) {
      return <Zap className="w-4 h-4 text-blue-500" />;
    }
    return null;
  };

  const getPlanLimits = (planName: string) => {
    const planType = normalizePlanType(planName.toLowerCase());
    return PLAN_LIMITS[planType];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {reasonContent.icon}
            <div>
              <DialogTitle className="text-xl">{reasonContent.title}</DialogTitle>
              <DialogDescription className="text-base mt-1">
                {reasonContent.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {upgradeOptions.map((option, index) => {
            const limits = getPlanLimits(option.name);
            return (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getPlanIcon(option.name)}
                    <h3 className="font-semibold text-lg">{option.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      ${option.price}/month
                    </Badge>
                  </div>
                  <span className="text-sm text-gray-500">{option.description}</span>
                </div>

                <p className="text-sm text-gray-600 mb-3">
                  Key AI features you'll unlock:
                </p>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    <span>
                      {limits.aiChatsPerDay === -1 ? (
                        <>
                          <Infinity className="w-3 h-3 inline" /> Unlimited
                        </>
                      ) : (
                        limits.aiChatsPerDay
                      )} AI chats/day
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-green-500" />
                    <span>File uploads {limits.exportData ? '✓' : '✗'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Download className="w-4 h-4 text-purple-500" />
                    <span>Export data {limits.exportData ? '✓' : '✗'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Crown className="w-4 h-4 text-yellow-500" />
                    <span>Grok AI {limits.aiChatsPerDay > 50 ? '✓' : '✗'}</span>
                  </div>
                </div>

                <ul className="text-sm text-gray-600 mb-4 space-y-1">
                  {option.benefits.map((benefit, benefitIndex) => (
                    <li key={benefitIndex} className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">•</span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => {
                    onSelectPlan?.(normalizePlanType(option.name.toLowerCase()));
                    onClose();
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Upgrade to {option.name} - ${option.price}/month
                </Button>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
