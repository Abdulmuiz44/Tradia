import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, FileText, Download, Infinity, TrendingUp } from 'lucide-react';
import { PlanType, PLAN_LIMITS } from '@/lib/planAccess';
import { cn } from '@/lib/utils';

interface UsageDashboardProps {
  currentPlan: PlanType;
  usageStats: {
    messages: number;
    uploads: number;
  };
  className?: string;
}

export const UsageDashboard: React.FC<UsageDashboardProps> = ({
  currentPlan,
  usageStats,
  className,
}) => {
  const limits = PLAN_LIMITS[currentPlan];

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formatLimit = (limit: number) => {
    return limit === -1 ? '∞' : limit.toString();
  };

  const usageItems = [
    {
      icon: <MessageSquare className="w-5 h-5" />,
      label: 'AI Chat Messages',
      used: usageStats.messages,
      limit: limits.aiChatsPerDay,
      description: 'Messages used today',
      color: 'blue',
    },
    {
      icon: <FileText className="w-5 h-5" />,
      label: 'File Uploads',
      used: usageStats.uploads,
      limit: limits.imageProcessing ? 10 : 0,
      description: 'Files uploaded today',
      color: 'green',
    },
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Daily Usage
        </CardTitle>
        <CardDescription>
          Your current plan usage for today. Limits reset daily.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {usageItems.map((item, index) => {
          const percentage = getUsagePercentage(item.used, item.limit);
          const isUnlimited = item.limit === -1;
          const isNearLimit = percentage >= 80;

          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'p-1 rounded',
                    item.color === 'blue' && 'bg-blue-100 text-blue-600',
                    item.color === 'green' && 'bg-green-100 text-green-600'
                  )}>
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.description}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-semibold">
                    {item.used}
                    {isUnlimited ? (
                      <Infinity className="w-4 h-4 inline ml-1 text-gray-400" />
                    ) : (
                      ` / ${item.limit}`
                    )}
                  </p>
                  {isNearLimit && !isUnlimited && (
                    <Badge variant="destructive" className="text-xs mt-1">
                      Near Limit
                    </Badge>
                  )}
                </div>
              </div>

              {!isUnlimited && (
                <Progress
                  value={percentage}
                  className={cn(
                    'h-2',
                    percentage >= 90 && '[&>div]:bg-red-500',
                    percentage >= 70 && percentage < 90 && '[&>div]:bg-yellow-500',
                    percentage < 70 && '[&>div]:bg-green-500'
                  )}
                />
              )}

              {isUnlimited && (
                <div className="h-2 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-xs text-gray-500">Unlimited</span>
                </div>
              )}
            </div>
          );
        })}

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Current Plan:</span>
            <Badge variant="outline" className="capitalize">
              {currentPlan}
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Upgrade to increase your daily limits and unlock premium features.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
