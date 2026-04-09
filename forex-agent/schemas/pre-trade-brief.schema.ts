/**
 * Draft schema artifact for pre_trade_briefs.
 */

export type ApprovalState = 'ready' | 'blocked' | 'manual_override';

export type PreTradeBrief = {
  id: string;
  userId: string;
  pairId: string;
  setupId: string;
  biasReportId: string;
  checklistId: string;
  entryPlan: {
    entryType: 'market' | 'limit' | 'stop';
    entryPrice?: number;
    stopLoss: number;
    takeProfit: number[];
    invalidation: string;
  };
  riskPlan: {
    riskPercent: number;
    maxDailyLossPercent: number;
    accountRuleNotes?: string;
  };
  eventRiskSummary: string;
  approvalState: ApprovalState;
  selectedEventIds: string[];
  createdAt: string;
  updatedAt: string;
};

export const validatePreTradeBriefDraft = (brief: PreTradeBrief): string[] => {
  const errors: string[] = [];
  if (!brief.entryPlan.invalidation.trim()) errors.push('entryPlan.invalidation is required');
  if (brief.riskPlan.riskPercent <= 0) errors.push('riskPercent must be > 0');
  if (brief.riskPlan.maxDailyLossPercent <= 0) errors.push('maxDailyLossPercent must be > 0');
  if (!brief.eventRiskSummary.trim()) errors.push('eventRiskSummary is required');
  return errors;
};
