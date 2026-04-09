/**
 * Draft schema artifact for trade_setups.
 */

export type SetupStatus = 'draft' | 'ready' | 'invalidated' | 'executed';

export type TradeSetup = {
  id: string;
  userId: string;
  pairId: string;
  setupName: string;
  setupType: 'breakout' | 'pullback' | 'reversal' | 'range' | 'news_reaction' | 'other';
  timeframe: string;
  session: 'ASIA' | 'LONDON' | 'NEW_YORK' | 'OVERLAP';
  confluenceFactors: string[];
  qualityScore: number; // 0-100
  status: SetupStatus;
  createdAt: string;
  updatedAt: string;
};

export const validateTradeSetupDraft = (setup: TradeSetup): string[] => {
  const errors: string[] = [];
  if (setup.setupName.trim().length < 3) errors.push('setupName must be at least 3 chars');
  if (setup.qualityScore < 0 || setup.qualityScore > 100) errors.push('qualityScore must be 0-100');
  if (!setup.confluenceFactors.length) errors.push('at least one confluence factor is required');
  return errors;
};
