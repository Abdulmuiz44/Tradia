/**
 * Draft schema artifact for market_bias_reports.
 */

export type BiasDirection = 'bullish' | 'bearish' | 'neutral';
export type BiasSource = 'manual' | 'ai' | 'hybrid';

export type MarketBiasReport = {
  id: string;
  userId: string;
  pairId: string;
  timeframeSet: string[]; // e.g., ['H4', 'H1', 'M15']
  biasDirection: BiasDirection;
  confidenceScore: number; // 0-100
  keyLevels: {
    support?: number[];
    resistance?: number[];
    invalidationLevel?: number;
  };
  assumptions: string;
  invalidationConditions: string;
  source: BiasSource;
  createdAt: string;
  updatedAt: string;
};

export const validateMarketBiasReportDraft = (report: MarketBiasReport): string[] => {
  const errors: string[] = [];
  if (report.confidenceScore < 0 || report.confidenceScore > 100) {
    errors.push('confidenceScore must be between 0 and 100');
  }
  if (!report.invalidationConditions.trim()) {
    errors.push('invalidationConditions is required');
  }
  if (!report.timeframeSet.length) {
    errors.push('timeframeSet must contain at least one timeframe');
  }
  return errors;
};
