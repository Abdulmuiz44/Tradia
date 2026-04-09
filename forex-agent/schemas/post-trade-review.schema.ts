/**
 * Draft schema artifact for post_trade_reviews.
 */

export type PostTradeReview = {
  id: string;
  userId: string;
  tradeId: string;
  briefId?: string;
  executionGrade: number; // 0-100
  ruleViolations: string[];
  processMistakes: string[];
  whatWorked: string;
  improvementsNextTrade: string[];
  aiSummary?: string;
  createdAt: string;
  updatedAt: string;
};

export const validatePostTradeReviewDraft = (review: PostTradeReview): string[] => {
  const errors: string[] = [];
  if (review.executionGrade < 0 || review.executionGrade > 100) {
    errors.push('executionGrade must be between 0 and 100');
  }
  if (review.improvementsNextTrade.length === 0) {
    errors.push('at least one improvement is required');
  }
  if (!review.whatWorked.trim()) {
    errors.push('whatWorked is required');
  }
  return errors;
};
