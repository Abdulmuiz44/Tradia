// src/lib/ai/AIService.ts
import { Trade } from '@/types/trade';

export interface TradePattern {
  type: 'winning_streak' | 'losing_streak' | 'consistent' | 'volatile' | 'trend_following' | 'counter_trend';
  confidence: number;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface PerformanceInsight {
  category: 'risk_management' | 'entry_timing' | 'exit_strategy' | 'position_sizing' | 'market_timing';
  priority: 'high' | 'medium' | 'low';
  insight: string;
  recommendation: string;
  expected_impact: string;
}

export interface MLTradeAnalysis {
  patterns: TradePattern[];
  insights: PerformanceInsight[];
  riskProfile: {
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
    riskScore: number;
    recommendations: string[];
  };
  marketAnalysis: {
    bestPerformingSymbols: string[];
    worstPerformingSymbols: string[];
    optimalTimeframes: string[];
    marketConditions: string[];
  };
  predictiveMetrics: {
    expectedWinRate: number;
    expectedProfitFactor: number;
    confidence: number;
  };
}

export interface UserPlan {
  id: 'starter' | 'pro' | 'plus' | 'elite';
  name: string;
  limits: {
    maxHistoryDays: number;
    maxAccounts: number;
    aiFeatures: string[];
    advancedAnalytics: boolean;
    strategyBuilder: boolean;
    propFirmDashboard: boolean;
  };
}

export interface AIReasoningProcess {
  questionAnalysis: string;
  dataConsidered: string[];
  reasoningSteps: string[];
  confidence: number;
  alternativeInterpretations: string[];
}

export class AIService {
  private static instance: AIService;
  private userPlan: UserPlan;

  private constructor() {
    // Default to starter plan - in real implementation, this would be fetched from user context
    this.userPlan = {
      id: 'starter',
      name: 'Starter',
      limits: {
        maxHistoryDays: 30,
        maxAccounts: 1,
        aiFeatures: ['basic_analytics', 'performance_overview'],
        advancedAnalytics: false,
        strategyBuilder: false,
        propFirmDashboard: false
      }
    };
  }

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Set user's current plan for feature limiting
   */
  setUserPlan(plan: UserPlan): void {
    this.userPlan = plan;
  }

  /**
   * Get user's current plan
   */
  getUserPlan(): UserPlan {
    return this.userPlan;
  }

  /**
   * Check if user has access to a specific feature
   */
  hasFeatureAccess(feature: string): boolean {
    return this.userPlan.limits.aiFeatures.includes(feature) ||
           this.userPlan.limits.advancedAnalytics ||
           this.userPlan.limits.strategyBuilder ||
           this.userPlan.limits.propFirmDashboard;
  }

  /**
   * Enhanced reasoning process for analyzing user questions
   */
  private analyzeQuestion(question: string): AIReasoningProcess {
    const question_lower = question.toLowerCase();

    const reasoning: AIReasoningProcess = {
      questionAnalysis: '',
      dataConsidered: [],
      reasoningSteps: [],
      confidence: 0.8,
      alternativeInterpretations: []
    };

    // Analyze question type and intent
    if (question_lower.includes('performance') || question_lower.includes('how am i doing')) {
      reasoning.questionAnalysis = 'User is asking for overall performance assessment';
      reasoning.dataConsidered = ['winRate', 'totalTrades', 'pnl', 'avgRR', 'profitFactor'];
      reasoning.reasoningSteps = [
        'Calculate key performance metrics from trade data',
        'Compare metrics against typical trader benchmarks',
        'Identify strengths and areas for improvement',
        'Provide actionable recommendations based on data patterns'
      ];
      reasoning.alternativeInterpretations = [
        'Could be asking for specific time period performance',
        'Might want comparison to previous periods',
        'Could be seeking validation of current strategy'
      ];
    }

    else if (question_lower.includes('mistake') || question_lower.includes('problem') || question_lower.includes('wrong')) {
      reasoning.questionAnalysis = 'User wants to identify trading mistakes and issues';
      reasoning.dataConsidered = ['losingTrades', 'riskManagement', 'entryExitTiming', 'emotionalPatterns'];
      reasoning.reasoningSteps = [
        'Analyze losing trade patterns for common mistakes',
        'Review risk management implementation',
        'Check for emotional decision patterns',
        'Identify systematic errors in trading process',
        'Prioritize issues by impact on performance'
      ];
      reasoning.alternativeInterpretations = [
        'Might be asking about specific trade mistakes',
        'Could want general trading psychology advice',
        'Might need help with trade review process'
      ];
    }

    else if (question_lower.includes('improve') || question_lower.includes('better')) {
      reasoning.questionAnalysis = 'User seeks specific improvement strategies';
      reasoning.dataConsidered = ['weaknesses', 'marketConditions', 'skillLevel', 'availableResources'];
      reasoning.reasoningSteps = [
        'Identify most impactful areas for improvement',
        'Assess current skill level and experience',
        'Consider market conditions and opportunities',
        'Create prioritized action plan',
        'Set realistic timelines and measurable goals'
      ];
      reasoning.alternativeInterpretations = [
        'Could be asking for general trading education',
        'Might want specific technique improvements',
        'Could need help with psychological barriers'
      ];
    }

    else {
      reasoning.questionAnalysis = 'General trading inquiry requiring contextual analysis';
      reasoning.dataConsidered = ['tradeHistory', 'performanceMetrics', 'marketContext'];
      reasoning.reasoningSteps = [
        'Gather relevant trading data and context',
        'Apply general trading knowledge and best practices',
        'Provide balanced, evidence-based response',
        'Offer follow-up questions for deeper analysis'
      ];
      reasoning.alternativeInterpretations = [
        'Could be seeking general trading advice',
        'Might need clarification on trading concepts',
        'Could be exploring new trading ideas'
      ];
    }

    return reasoning;
  }

  /**
   * Analyze trade patterns using machine learning algorithms
   */
  analyzeTradePatterns(trades: Trade[]): TradePattern[] {
    if (!trades || trades.length < 5) {
      return [{
        type: 'consistent',
        confidence: 0.5,
        description: 'Insufficient data for pattern analysis',
        impact: 'neutral'
      }];
    }

    const patterns: TradePattern[] = [];

    // Analyze winning/losing streaks
    const outcomes = trades.map(t => t.outcome || 'Breakeven');
    const streaks = this.calculateStreaks(outcomes);

    if (streaks.longestWinStreak >= 5) {
      patterns.push({
        type: 'winning_streak',
        confidence: Math.min(0.9, streaks.longestWinStreak / 10),
        description: `Strong winning streak of ${streaks.longestWinStreak} trades`,
        impact: 'positive'
      });
    }

    if (streaks.longestLossStreak >= 3) {
      patterns.push({
        type: 'losing_streak',
        confidence: Math.min(0.8, streaks.longestLossStreak / 5),
        description: `Concerning losing streak of ${streaks.longestLossStreak} trades`,
        impact: 'negative'
      });
    }

    // Analyze consistency
    const winRate = outcomes.filter(o => o === 'Win').length / outcomes.length;
    const consistency = this.calculateConsistency(trades);

    if (consistency > 0.7) {
      patterns.push({
        type: 'consistent',
        confidence: consistency,
        description: 'Highly consistent trading performance',
        impact: 'positive'
      });
    } else if (consistency < 0.4) {
      patterns.push({
        type: 'volatile',
        confidence: 1 - consistency,
        description: 'High volatility in trading results',
        impact: 'negative'
      });
    }

    // Analyze market timing
    const marketTiming = this.analyzeMarketTiming(trades);
    if (marketTiming.isTrendFollower) {
      patterns.push({
        type: 'trend_following',
        confidence: marketTiming.confidence,
        description: 'Successfully following market trends',
        impact: 'positive'
      });
    }

    return patterns;
  }

  /**
   * Generate performance insights using AI analysis
   */
  generatePerformanceInsights(trades: Trade[]): PerformanceInsight[] {
    const insights: PerformanceInsight[] = [];

    if (!trades || trades.length === 0) return insights;

    // Risk management analysis
    const riskInsights = this.analyzeRiskManagement(trades);
    insights.push(...riskInsights);

    // Entry timing analysis
    const entryInsights = this.analyzeEntryTiming(trades);
    insights.push(...entryInsights);

    // Exit strategy analysis
    const exitInsights = this.analyzeExitStrategy(trades);
    insights.push(...exitInsights);

    // Position sizing analysis
    const sizingInsights = this.analyzePositionSizing(trades);
    insights.push(...sizingInsights);

    // Market timing analysis
    const timingInsights = this.analyzeMarketConditions(trades);
    insights.push(...timingInsights);

    // Sort by priority
    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Create comprehensive ML analysis
   */
  async createMLAnalysis(trades: Trade[]): Promise<MLTradeAnalysis> {
    // Simulate ML processing time
    await new Promise(resolve => setTimeout(resolve, 500));

    const patterns = this.analyzeTradePatterns(trades);
    const insights = this.generatePerformanceInsights(trades);

    const riskProfile = this.calculateRiskProfile(trades);
    const marketAnalysis = this.analyzeMarketPerformance(trades);
    const predictiveMetrics = this.generatePredictiveMetrics(trades);

    return {
      patterns,
      insights,
      riskProfile,
      marketAnalysis,
      predictiveMetrics
    };
  }

  /**
   * Generate personalized AI response based on user query and trade data
   */
  async generatePersonalizedResponse(
    query: string,
    trades: Trade[],
    context?: {
      recentTrades?: Trade[];
      marketCondition?: string;
      uploadedImages?: File[];
    }
  ): Promise<string> {
    // Step 1: Analyze the user's question with enhanced reasoning
    const reasoning = this.analyzeQuestion(query);

    // Step 2: Check plan limits and feature access
    const hasAdvancedFeatures = this.hasFeatureAccess('advanced_analytics');
    const hasAISuggestions = this.hasFeatureAccess('ai_trade_reviews');
    const hasStrategyBuilder = this.userPlan.limits.strategyBuilder;

    // Step 3: Filter trades based on plan limits
    const filteredTrades = this.filterTradesByPlanLimits(trades);

    // Step 4: Create ML analysis with plan-aware processing
    const analysis = await this.createMLAnalysis(filteredTrades);

    // Step 5: Analyze uploaded images if any
    let imageAnalysis = '';
    if (context?.uploadedImages && context.uploadedImages.length > 0) {
      if (this.hasFeatureAccess('screenshot_analysis')) {
        imageAnalysis = await this.analyzeUploadedImages(context.uploadedImages, filteredTrades);
      } else {
        imageAnalysis = '\n\n📸 *Screenshot analysis is available on Pro plan and above. Upgrade to get AI-powered visual trade analysis!*';
      }
    }

    // Step 6: Generate response with plan-aware content
    const query_lower = query.toLowerCase();
    let response = '';

    // Add reasoning transparency for Pro+ users
    const showReasoning = hasAdvancedFeatures;

    if (showReasoning) {
      response += `🤔 **Tradia AI's Analysis Process:**\n`;
      response += `• Question Type: ${reasoning.questionAnalysis}\n`;
      response += `• Data Considered: ${reasoning.dataConsidered.join(', ')}\n`;
      response += `• Confidence: ${(reasoning.confidence * 100).toFixed(0)}%\n\n`;
    }

    // Generate response based on query type with plan limits
    if (query_lower.includes('performance') || query_lower.includes('how am i doing')) {
      response += this.generatePerformanceResponse(analysis, filteredTrades, hasAdvancedFeatures);
    }

    else if (query_lower.includes('mistake') || query_lower.includes('problem') || query_lower.includes('wrong')) {
      response += this.generateMistakesResponse(analysis, filteredTrades, hasAISuggestions);
    }

    else if (query_lower.includes('improve') || query_lower.includes('better') || query_lower.includes('win rate')) {
      response += this.generateImprovementResponse(analysis, filteredTrades, hasStrategyBuilder);
    }

    else if (query_lower.includes('risk') || query_lower.includes('position size')) {
      response += this.generateRiskResponse(analysis, filteredTrades, hasAdvancedFeatures);
    }

    else if (query_lower.includes('market') || query_lower.includes('trend') || query_lower.includes('timing')) {
      response += this.generateMarketResponse(analysis, filteredTrades, hasAdvancedFeatures);
    }

    else if (query_lower.includes('predict') || query_lower.includes('future') || query_lower.includes('expect')) {
      if (hasAdvancedFeatures) {
        response += this.generatePredictionResponse(analysis, filteredTrades);
      } else {
        response += `🔮 **Future Performance Predictions**\n\n`;
        response += `Predictive analytics are available on Pro plan and above. Here's what I can tell you based on your current data:\n\n`;
        response += `**Current Trajectory:** ${analysis.predictiveMetrics.expectedWinRate > 0.5 ? 'Positive' : 'Needs improvement'}\n`;
        response += `**Key Factors:** Focus on consistency and risk management\n\n`;
        response += `💡 *Upgrade to Pro for detailed performance predictions and AI-powered forecasting!*`;
      }
    }

    else {
      // Default comprehensive response
      response += this.generateComprehensiveResponse(analysis, filteredTrades, query, imageAnalysis, hasAdvancedFeatures);
    }

    // Add plan-specific footer
    response += this.generatePlanFooter();

    return response;
  }

  /**
   * Filter trades based on user's plan limits
   */
  private filterTradesByPlanLimits(trades: Trade[]): Trade[] {
    const maxDays = this.userPlan.limits.maxHistoryDays;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxDays);

    return trades.filter(trade => {
      const tradeDate = trade.closeTime ? new Date(trade.closeTime) : new Date(trade.openTime);
      return tradeDate >= cutoffDate;
    });
  }

  /**
   * Generate plan-specific footer with upgrade prompts
   */
  private generatePlanFooter(): string {
    const plan = this.userPlan;

    if (plan.id === 'starter') {
      return `\n\n---\n💡 **You're on the ${plan.name} plan** - Upgrade to Pro for:\n• 6 months trade history (vs 30 days)\n• Advanced AI insights & predictions\n• 3 account connections\n• AI weekly performance summaries\n\n[Upgrade to Pro](${'/pricing'})`;
    }

    if (plan.id === 'pro') {
      return `\n\n---\n💡 **You're on the ${plan.name} plan** - Upgrade to Plus for:\n• Unlimited trade history\n• AI trade reviews & suggestions\n• 5 account connections\n• Advanced strategy builder\n\n[Upgrade to Plus](${'/pricing'})`;
    }

    if (plan.id === 'plus') {
      return `\n\n---\n💡 **You're on the ${plan.name} plan** - Upgrade to Elite for:\n• Unlimited account connections\n• Prop-firm dashboard\n• Advanced AI strategy builder\n• Priority support\n\n[Upgrade to Elite](${'/pricing'})`;
    }

    return `\n\n---\n🎯 **${plan.name} Plan** - You're using our most advanced features!`;
  }

  // Helper methods for analysis
  private calculateStreaks(outcomes: string[]) {
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let longestWinStreak = 0;
    let longestLossStreak = 0;

    for (const outcome of outcomes) {
      if (outcome === 'Win') {
        currentWinStreak++;
        currentLossStreak = 0;
        longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
      } else if (outcome === 'Loss') {
        currentLossStreak++;
        currentWinStreak = 0;
        longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
      }
    }

    return { longestWinStreak, longestLossStreak };
  }

  private calculateConsistency(trades: Trade[]): number {
    if (trades.length < 5) return 0.5;

    const outcomes = trades.map(t => t.outcome);
    const winRate = outcomes.filter(o => o === 'Win').length / outcomes.length;

    // Calculate variance in performance
    const pnlValues = trades.map(t => t.pnl || 0);
    const mean = pnlValues.reduce((a, b) => a + b, 0) / pnlValues.length;
    const variance = pnlValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / pnlValues.length;
    const stdDev = Math.sqrt(variance);

    // Lower standard deviation = higher consistency
    const consistencyScore = Math.max(0, 1 - (stdDev / Math.abs(mean || 1)));

    return (winRate * 0.6 + consistencyScore * 0.4);
  }

  private analyzeMarketTiming(trades: Trade[]): { isTrendFollower: boolean; confidence: number } {
    // Simple trend following analysis based on entry timing vs market direction
    // In a real implementation, this would use technical indicators
    const profitableTrades = trades.filter(t => (t.pnl || 0) > 0);

    if (profitableTrades.length < 3) {
      return { isTrendFollower: false, confidence: 0.3 };
    }

    // Assume trend following if more than 60% of profitable trades align with "trend"
    const trendAligned = profitableTrades.length * 0.6; // Simplified assumption
    const confidence = Math.min(0.9, trendAligned / profitableTrades.length);

    return {
      isTrendFollower: confidence > 0.6,
      confidence
    };
  }

  private analyzeRiskManagement(trades: Trade[]): PerformanceInsight[] {
    const insights: PerformanceInsight[] = [];

    // Analyze position sizing consistency
    const lotSizes = trades.map(t => {
      const size = t.lotSize;
      if (typeof size === 'string') {
        const numSize = parseFloat(size);
        return isNaN(numSize) ? 0 : numSize;
      }
      return size || 0;
    }).filter(size => size > 0);

    if (lotSizes.length > 0) {
      const avgSize = lotSizes.reduce((a, b) => a + b, 0) / lotSizes.length;
      const variance = lotSizes.reduce((a, b) => a + Math.pow(b - avgSize, 2), 0) / lotSizes.length;
      const cv = Math.sqrt(variance) / avgSize; // Coefficient of variation

      if (cv > 0.5) {
        insights.push({
          category: 'risk_management',
          priority: 'high',
          insight: 'Inconsistent position sizing increases risk',
          recommendation: 'Use a fixed percentage of capital for each trade',
          expected_impact: 'More predictable risk exposure and better capital management'
        });
      }
    }

    // Analyze stop loss usage
    const tradesWithSL = trades.filter(t => {
      const sl = t.stopLossPrice;
      if (typeof sl === 'string') {
        const numSl = parseFloat(sl);
        return !isNaN(numSl) && numSl > 0;
      }
      return (sl || 0) > 0;
    });
    const slUsage = tradesWithSL.length / trades.length;

    if (slUsage < 0.7) {
      insights.push({
        category: 'risk_management',
        priority: 'high',
        insight: 'Inconsistent stop loss usage',
        recommendation: 'Always set stop losses before entering trades',
        expected_impact: 'Better risk control and reduced drawdown'
      });
    }

    return insights;
  }

  private analyzeEntryTiming(trades: Trade[]): PerformanceInsight[] {
    const insights: PerformanceInsight[] = [];

    // Analyze win rate by time of day
    const hourlyPerformance = this.groupTradesByHour(trades);
    const bestHour = Object.entries(hourlyPerformance)
      .sort(([,a], [,b]) => b.winRate - a.winRate)[0];

    if (bestHour && bestHour[1].winRate > 0.6 && bestHour[1].count >= 3) {
      insights.push({
        category: 'entry_timing',
        priority: 'medium',
        insight: `Best performance at ${bestHour[0]}:00 (${(bestHour[1].winRate * 100).toFixed(0)}% win rate)`,
        recommendation: 'Focus trading during your most profitable hours',
        expected_impact: 'Higher win rate by trading when you perform best'
      });
    }

    return insights;
  }

  private analyzeExitStrategy(trades: Trade[]): PerformanceInsight[] {
    const insights: PerformanceInsight[] = [];

    // Analyze profit taking vs stop losses
    const winners = trades.filter(t => (t.pnl || 0) > 0);
    const losers = trades.filter(t => (t.pnl || 0) < 0);

    const avgWinner = winners.length > 0
      ? winners.reduce((sum, t) => sum + (t.pnl || 0), 0) / winners.length
      : 0;

    const avgLoser = losers.length > 0
      ? Math.abs(losers.reduce((sum, t) => sum + (t.pnl || 0), 0) / losers.length)
      : 0;

    if (avgWinner > 0 && avgLoser > 0) {
      const rrRatio = avgWinner / avgLoser;

      if (rrRatio < 1.5) {
        insights.push({
          category: 'exit_strategy',
          priority: 'high',
          insight: `Poor risk-reward ratio: ${rrRatio.toFixed(2)}R`,
          recommendation: 'Aim for minimum 1:2 risk-reward on every trade',
          expected_impact: 'Better profitability with same win rate'
        });
      }
    }

    return insights;
  }

  private analyzePositionSizing(trades: Trade[]): PerformanceInsight[] {
    const insights: PerformanceInsight[] = [];

    // Analyze if position sizes correlate with win rate
    const sizeGroups = this.groupTradesBySize(trades);

    const bestSizeGroup = Object.entries(sizeGroups)
      .sort(([,a], [,b]) => b.winRate - a.winRate)[0];

    if (bestSizeGroup && bestSizeGroup[1].winRate > 0.6 && bestSizeGroup[1].count >= 5) {
      insights.push({
        category: 'position_sizing',
        priority: 'medium',
        insight: `Best performance with ${bestSizeGroup[0]} position sizes`,
        recommendation: 'Scale position sizes based on confidence and market conditions',
        expected_impact: 'Optimized risk-adjusted returns'
      });
    }

    return insights;
  }

  private analyzeMarketConditions(trades: Trade[]): PerformanceInsight[] {
    const insights: PerformanceInsight[] = [];

    // Group by symbol
    const symbolPerformance = this.groupTradesBySymbol(trades);
    const bestSymbol = Object.entries(symbolPerformance)
      .sort(([,a], [,b]) => b.winRate - a.winRate)[0];

    if (bestSymbol && bestSymbol[1].winRate > 0.6 && bestSymbol[1].count >= 5) {
      insights.push({
        category: 'market_timing',
        priority: 'medium',
        insight: `Strong performance in ${bestSymbol[0]}`,
        recommendation: 'Focus on your best performing instruments',
        expected_impact: 'Higher overall win rate'
      });
    }

    return insights;
  }

  private calculateRiskProfile(trades: Trade[]) {
    const totalTrades = trades.length;
    const wins = trades.filter(t => t.outcome === 'Win').length;
    const winRate = totalTrades > 0 ? wins / totalTrades : 0;

    const avgLoss = trades
      .filter(t => (t.pnl || 0) < 0)
      .reduce((sum, t) => sum + Math.abs(t.pnl || 0), 0) / Math.max(1, trades.filter(t => (t.pnl || 0) < 0).length);

    const maxDrawdown = this.calculateMaxDrawdown(trades);
    const consistency = this.calculateConsistency(trades);

    // Calculate risk score (0-100, higher = riskier)
    const riskScore = Math.min(100, Math.max(0,
      (1 - winRate) * 40 + // Low win rate = higher risk
      (avgLoss > 100 ? 30 : avgLoss > 50 ? 20 : 10) + // Large losses = higher risk
      (maxDrawdown > 20 ? 20 : maxDrawdown > 10 ? 10 : 0) + // High drawdown = higher risk
      (1 - consistency) * 20 // Inconsistent = higher risk
    ));

    let riskTolerance: 'conservative' | 'moderate' | 'aggressive';
    if (riskScore < 30) riskTolerance = 'conservative';
    else if (riskScore < 60) riskTolerance = 'moderate';
    else riskTolerance = 'aggressive';

    const recommendations = [];
    if (riskScore > 60) {
      recommendations.push('Reduce position sizes to lower risk exposure');
      recommendations.push('Implement stricter stop loss rules');
      recommendations.push('Focus on high-probability setups only');
    } else if (riskScore > 30) {
      recommendations.push('Consider position size adjustments');
      recommendations.push('Review risk management rules');
    } else {
      recommendations.push('Your risk management is solid');
      recommendations.push('Consider gradual position size increases');
    }

    return { riskTolerance, riskScore, recommendations };
  }

  private analyzeMarketPerformance(trades: Trade[]) {
    const symbolStats = this.groupTradesBySymbol(trades);

    const sortedSymbols = Object.entries(symbolStats)
      .sort(([,a], [,b]) => b.winRate - a.winRate);

    const bestPerformingSymbols = sortedSymbols
      .slice(0, 3)
      .map(([symbol]) => symbol);

    const worstPerformingSymbols = sortedSymbols
      .slice(-3)
      .map(([symbol]) => symbol);

    // Simplified timeframe analysis
    const optimalTimeframes = ['1H', '4H', 'Daily']; // Would be calculated from actual data

    const marketConditions = [];
    if (trades.length > 10) {
      const recentWinRate = trades.slice(-10).filter(t => t.outcome === 'Win').length / 10;
      if (recentWinRate > 0.6) {
        marketConditions.push('Performing well in current market conditions');
      } else if (recentWinRate < 0.4) {
        marketConditions.push('Struggling in current market conditions');
      }
    }

    return {
      bestPerformingSymbols,
      worstPerformingSymbols,
      optimalTimeframes,
      marketConditions
    };
  }

  private generatePredictiveMetrics(trades: Trade[]) {
    if (trades.length < 10) {
      return {
        expectedWinRate: 0.5,
        expectedProfitFactor: 1.0,
        confidence: 0.3
      };
    }

    // Simple predictive model based on recent performance
    const recentTrades = trades.slice(-20);
    const recentWinRate = recentTrades.filter(t => t.outcome === 'Win').length / recentTrades.length;

    const recentProfit = recentTrades
      .filter(t => (t.pnl || 0) > 0)
      .reduce((sum, t) => sum + (t.pnl || 0), 0);

    const recentLoss = Math.abs(recentTrades
      .filter(t => (t.pnl || 0) < 0)
      .reduce((sum, t) => sum + (t.pnl || 0), 0));

    const recentProfitFactor = recentLoss > 0 ? recentProfit / recentLoss : recentProfit > 0 ? 2.0 : 0.5;

    // Weight recent performance more heavily
    const overallWinRate = trades.filter(t => t.outcome === 'Win').length / trades.length;
    const expectedWinRate = (recentWinRate * 0.7) + (overallWinRate * 0.3);

    const overallProfitFactor = this.calculateProfitFactor(trades);
    const expectedProfitFactor = (recentProfitFactor * 0.6) + (overallProfitFactor * 0.4);

    const confidence = Math.min(0.9, trades.length / 50); // Higher confidence with more data

    return {
      expectedWinRate,
      expectedProfitFactor,
      confidence
    };
  }

  private async analyzeUploadedImages(images: File[], trades: Trade[]): Promise<string> {
    // Simulate image analysis
    await new Promise(resolve => setTimeout(resolve, 1000));

    const analysis = [];

    if (images.length === 1) {
      analysis.push("📸 I've analyzed your trade screenshot. This appears to be a price chart with your entry and exit points marked.");
      analysis.push("💡 The setup shows a clear trend direction with proper risk management.");
    } else if (images.length === 2) {
      analysis.push("📸 I've analyzed your before/after screenshots:");
      analysis.push("• The 'before' shows the setup and entry timing");
      analysis.push("• The 'after' demonstrates the outcome and exit strategy");
      analysis.push("💡 This comparison helps identify what worked well in your trade execution.");
    } else {
      analysis.push(`📸 I've analyzed ${images.length} screenshots from your trading session.`);
      analysis.push("💡 The images show your complete trade process from setup to execution.");
    }

    // Add trade-specific insights
    if (trades.length > 0) {
      const recentTrade = trades[trades.length - 1];
      analysis.push(`\n🔗 Connecting to your recent trade in ${recentTrade.symbol}:`);
      analysis.push(`• Your screenshot style aligns with ${recentTrade.outcome === 'Win' ? 'successful' : 'learning'} trades`);
      analysis.push(`• Consider applying these visual analysis techniques to future trades`);
    }

    return analysis.join('\n');
  }

  // Response generation methods with plan limits
  private generatePerformanceResponse(analysis: MLTradeAnalysis, trades: Trade[], hasAdvancedFeatures: boolean): string {
    const totalTrades = trades.length;
    const wins = trades.filter(t => t.outcome === 'Win').length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

    return `📊 **AI Performance Analysis:**

**Current Metrics:**
- Win Rate: ${winRate.toFixed(1)}%
- Total Trades: ${totalTrades}
- Risk Profile: ${analysis.riskProfile.riskTolerance} (${analysis.riskProfile.riskScore}/100)

**Key Patterns Identified:**
${analysis.patterns.map(p => `• ${p.description} (${(p.confidence * 100).toFixed(0)}% confidence)`).join('\n')}

**Top Insights:**
${analysis.insights.slice(0, 3).map(i => `🎯 ${i.insight}\n   → ${i.recommendation}`).join('\n\n')}

**Market Performance:**
- Best Symbols: ${analysis.marketAnalysis.bestPerformingSymbols.join(', ')}
- Optimal Timeframes: ${analysis.marketAnalysis.optimalTimeframes.join(', ')}

**Predictions:**
- Expected Win Rate: ${(analysis.predictiveMetrics.expectedWinRate * 100).toFixed(1)}%
- Expected Profit Factor: ${analysis.predictiveMetrics.expectedProfitFactor.toFixed(2)}
- Confidence: ${(analysis.predictiveMetrics.confidence * 100).toFixed(0)}%

You're doing ${winRate > 60 ? 'excellent' : winRate > 45 ? 'well' : 'okay'} - focus on the insights above to improve further!`;
  }

  private generateMistakesResponse(analysis: MLTradeAnalysis, trades: Trade[], hasAISuggestions: boolean): string {
    const mistakes = analysis.insights.filter(i => i.priority === 'high');

    let response = `🔍 **AI Mistake Analysis:**

**Critical Issues Found:**
${mistakes.length > 0
  ? mistakes.map(m => `❌ ${m.insight}\n   💡 ${m.recommendation}\n   📈 Expected Impact: ${m.expected_impact}`).join('\n\n')
  : '✅ No major mistakes detected in your recent trading'}`;

    if (hasAISuggestions) {
      response += `

**AI-Powered Mistake Detection:**
• Pattern recognition in your losing trades
• Emotional bias identification
• Risk management gap analysis
• Entry/exit timing optimization suggestions

**Advanced Analysis:**
${analysis.patterns.filter(p => p.impact === 'negative').map(p => `⚠️ ${p.description}`).join('\n')}`;
    } else {
      response += `

**Common Trading Mistakes to Avoid:**
1. **Overtrading**: Taking too many trades reduces quality
2. **Revenge Trading**: Avoid increasing size after losses
3. **No Stop Losses**: Always protect your capital
4. **Ignoring Risk Management**: Position size matters
5. **Emotional Decisions**: Stick to your trading plan

💡 *Upgrade to Plus plan for AI-powered mistake detection and personalized correction strategies!*`;
    }

    response += `

**Your Risk Management Score:** ${analysis.riskProfile.riskScore}/100

**Recommendations:**
${analysis.riskProfile.recommendations.map(r => `• ${r}`).join('\n')}

**Quick Fix Actions:**
- Review your last 5 losing trades for patterns
- Ensure all trades have predetermined exits
- Use position sizing calculator for every trade
- Take breaks after losing streaks

Remember: Mistakes are learning opportunities. Focus on the process, not just profits.`;

    return response;
  }

  private generateImprovementResponse(analysis: MLTradeAnalysis, trades: Trade[], hasStrategyBuilder: boolean): string {
    const improvements = analysis.insights.filter(i => i.priority === 'high' || i.priority === 'medium');

    let response = `🚀 **AI Improvement Plan:**

**Priority Improvements:**
${improvements.map(i => `🎯 **${i.category.replace('_', ' ').toUpperCase()}**\n   ${i.insight}\n   💡 ${i.recommendation}\n   📈 ${i.expected_impact}`).join('\n\n')}

**Your Current Strengths:**
${analysis.patterns.filter(p => p.impact === 'positive').map(p => `✅ ${p.description}`).join('\n')}`;

    if (hasStrategyBuilder) {
      response += `

**🤖 AI Strategy Builder Recommendations:**

**Custom Strategy Suggestions:**
${this.generateStrategySuggestions(analysis, trades)}

**Advanced Optimization:**
• Risk-adjusted position sizing algorithm
• Market condition adaptation strategies
• Performance-based trade filtering
• Automated strategy refinement

**Elite Features:**
• Backtesting simulation results
• Walk-forward analysis optimization
• Monte Carlo risk simulation
• Multi-timeframe strategy integration`;
    } else {
      response += `

**7-Day Action Plan:**

**Day 1-2: Foundation**
- Review your trading journal for patterns
- Set up proper risk management rules
- Define your ideal trade setup

**Day 3-4: Execution**
- Practice entries with better timing
- Implement consistent position sizing
- Focus on high-probability setups only

**Day 5-7: Review & Adjust**
- Analyze weekly performance
- Adjust strategy based on results
- Plan improvements for next week

💡 *Upgrade to Elite plan for AI-powered strategy builder and automated optimization!*`;
    }

    response += `

**Key Success Factors:**
1. **Consistency**: Follow your plan every trade
2. **Patience**: Wait for your best setups
3. **Risk Control**: Never risk more than 1-2%
4. **Learning**: Review both wins and losses
5. **Adaptation**: Adjust based on market conditions

**Expected Results:**
- Win Rate Improvement: +5-15%
- Reduced Drawdown: -20-50%
- Better Risk-Adjusted Returns: +10-30%

Start with one improvement at a time. Small, consistent changes lead to big results!`;

    return response;
  }

  /**
   * Generate AI-powered strategy suggestions for Elite users
   */
  private generateStrategySuggestions(analysis: MLTradeAnalysis, trades: Trade[]): string {
    const suggestions = [];

    // Analyze best performing patterns
    const bestPatterns = analysis.patterns.filter(p => p.impact === 'positive');
    if (bestPatterns.length > 0) {
      suggestions.push(`**Exploit Your Strengths:** ${bestPatterns[0].description}`);
    }

    // Market timing optimization
    if (analysis.marketAnalysis.bestPerformingSymbols.length > 0) {
      suggestions.push(`**Focus Markets:** Prioritize ${analysis.marketAnalysis.bestPerformingSymbols.slice(0, 2).join(', ')}`);
    }

    // Risk optimization
    if (analysis.riskProfile.riskTolerance === 'conservative') {
      suggestions.push(`**Conservative Strategy:** Implement stricter filters, smaller position sizes`);
    } else if (analysis.riskProfile.riskTolerance === 'aggressive') {
      suggestions.push(`**Aggressive Optimization:** Increase position sizes on high-confidence signals`);
    }

    // Performance-based adjustments
    if (analysis.predictiveMetrics.expectedWinRate > 0.6) {
      suggestions.push(`**Scale Strategy:** Consider increasing position sizes with proven approach`);
    } else {
      suggestions.push(`**Refine Approach:** Focus on quality over quantity of trades`);
    }

    return suggestions.map(s => `• ${s}`).join('\n');
  }

  private generateRiskResponse(analysis: MLTradeAnalysis, trades: Trade[], hasAdvancedFeatures: boolean): string {
    return `🛡️ **AI Risk Management Analysis:**

**Your Risk Profile:** ${analysis.riskProfile.riskTolerance.toUpperCase()}
**Risk Score:** ${analysis.riskProfile.riskScore}/100

**Current Risk Management:**
${analysis.insights.filter(i => i.category === 'risk_management').map(i => `• ${i.insight}`).join('\n')}

**Risk Management Best Practices:**

**1. Position Sizing**
- Risk 1-2% of capital per trade
- Adjust based on win rate and confidence
- Use position size calculator

**2. Stop Loss Rules**
- Always set stop losses before entry
- Place at logical levels (support/resistance)
- Never move stops to avoid losses

**3. Risk-Reward Ratio**
- Minimum 1:2 RR on every trade
- Aim for 1:3 on high-confidence trades
- Accept 1:1 only in exceptional cases

**4. Daily Loss Limits**
- Set maximum daily loss (2-5% of capital)
- Stop trading when limit reached
- Never trade to recover losses

**5. Portfolio Diversification**
- Don't over-concentrate in one symbol
- Spread risk across different markets
- Consider correlation between positions

**Your Risk Recommendations:**
${analysis.riskProfile.recommendations.map(r => `💡 ${r}`).join('\n')}

**Risk Monitoring:**
- Track maximum drawdown
- Monitor win/loss streaks
- Review risk-adjusted returns monthly

Remember: Risk management is what keeps you in the game. Profits take care of themselves when risk is controlled.`;
  }

  private generateMarketResponse(analysis: MLTradeAnalysis, trades: Trade[], hasAdvancedFeatures: boolean): string {
    return `📈 **AI Market Analysis:**

**Your Best Performing Markets:**
${analysis.marketAnalysis.bestPerformingSymbols.map(s => `✅ ${s}`).join('\n')}

**Markets to Avoid:**
${analysis.marketAnalysis.worstPerformingSymbols.map(s => `⚠️ ${s}`).join('\n')}

**Optimal Trading Times:**
${analysis.marketAnalysis.optimalTimeframes.map(t => `🕐 ${t}`).join('\n')}

**Market Conditions Analysis:**
${analysis.marketAnalysis.marketConditions.map(c => `🌍 ${c}`).join('\n')}

**Market Timing Insights:**
${analysis.insights.filter(i => i.category === 'market_timing').map(i => `🎯 ${i.insight}\n   💡 ${i.recommendation}`).join('\n\n')}

**Market Selection Strategy:**

**1. Focus on Strengths**
- Trade your best performing symbols
- Avoid markets where you struggle
- Specialize rather than diversify

**2. Timeframe Selection**
- Use timeframes that suit your schedule
- Match timeframe to your trading style
- Consider market volatility

**3. Market Conditions**
- Trade with the trend when possible
- Avoid ranging markets if you're a trend trader
- Monitor economic calendar events

**4. Seasonal Patterns**
- Some markets have seasonal tendencies
- Consider time of day preferences
- Adapt to changing market conditions

**Market Adaptation Tips:**
- Keep a market watchlist
- Track performance by symbol
- Adjust strategy based on market conditions
- Have backup markets ready

**Pro Tip:** The best traders specialize in a few markets they understand deeply rather than trading everything available.`;
  }

  private generatePredictionResponse(analysis: MLTradeAnalysis, trades: Trade[]): string {
    return `🔮 **AI Performance Predictions:**

**Based on ${trades.length} trades and machine learning analysis:**

**Predicted Metrics:**
- Win Rate: ${(analysis.predictiveMetrics.expectedWinRate * 100).toFixed(1)}%
- Profit Factor: ${analysis.predictiveMetrics.expectedProfitFactor.toFixed(2)}
- Confidence Level: ${(analysis.predictiveMetrics.confidence * 100).toFixed(0)}%

**Prediction Factors:**
${analysis.patterns.map(p => `• ${p.description} (${p.impact === 'positive' ? '📈' : p.impact === 'negative' ? '📉' : '➡️'})`).join('\n')}

**Risk Assessment:**
- Current Risk Level: ${analysis.riskProfile.riskTolerance}
- Risk Score: ${analysis.riskProfile.riskScore}/100
- ${analysis.riskProfile.riskScore < 30 ? 'Conservative approach recommended' : analysis.riskProfile.riskScore < 60 ? 'Moderate risk acceptable' : 'High risk - reduce exposure'}

**Improvement Potential:**
${analysis.insights.filter(i => i.priority === 'high').map(i => `🚀 ${i.expected_impact}`).join('\n')}

**30-Day Forecast:**
- Expected Performance: ${analysis.predictiveMetrics.expectedWinRate > 0.55 ? 'Above average' : analysis.predictiveMetrics.expectedWinRate > 0.45 ? 'Average' : 'Below average'}
- Risk of Drawdown: ${analysis.riskProfile.riskScore > 60 ? 'High' : analysis.riskProfile.riskScore > 30 ? 'Moderate' : 'Low'}
- Growth Potential: ${analysis.insights.length < 3 ? 'High' : analysis.insights.length < 6 ? 'Medium' : 'Low'}

**Key Success Factors:**
1. **Consistency**: ${analysis.patterns.some(p => p.type === 'consistent') ? '✅ Already strong' : '🎯 Needs improvement'}
2. **Risk Management**: ${analysis.riskProfile.riskScore < 40 ? '✅ Well managed' : '🎯 Needs attention'}
3. **Market Selection**: ${analysis.marketAnalysis.bestPerformingSymbols.length > 0 ? '✅ Good choices' : '🎯 Could improve'}
4. **Timing**: ${analysis.insights.some(i => i.category === 'entry_timing') ? '🎯 Opportunity to improve' : '✅ Good timing'}

**Action Plan:**
${analysis.insights.slice(0, 3).map(i => `• ${i.recommendation}`).join('\n')}

Remember: These predictions are based on your historical data. Actual results depend on market conditions and execution quality.`;
  }

  private generateComprehensiveResponse(analysis: MLTradeAnalysis, trades: Trade[], query: string, imageAnalysis: string, hasAdvancedFeatures: boolean): string {
    const totalTrades = trades.length;
    const wins = trades.filter(t => t.outcome === 'Win').length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

    return `🤖 **Tradia AI Comprehensive Analysis:**

Hello! I'm your AI trading assistant. Based on your ${totalTrades} trades, here's a complete overview:

**📊 Performance Summary:**
- Win Rate: ${winRate.toFixed(1)}%
- Risk Profile: ${analysis.riskProfile.riskTolerance}
- Trading Consistency: ${(analysis.predictiveMetrics.confidence * 100).toFixed(0)}%

**🎯 Key Patterns:**
${analysis.patterns.slice(0, 3).map(p => `• ${p.description}`).join('\n')}

**💡 Top Recommendations:**
${analysis.insights.slice(0, 3).map(i => `• ${i.recommendation}`).join('\n')}

**📈 Market Performance:**
- Best Symbols: ${analysis.marketAnalysis.bestPerformingSymbols.slice(0, 2).join(', ')}
- Expected Win Rate: ${(analysis.predictiveMetrics.expectedWinRate * 100).toFixed(1)}%

${imageAnalysis}

**Quick Questions I Can Help With:**
• "What's my overall performance?"
• "What are my biggest mistakes?"
• "How can I improve my win rate?"
• "Analyze my risk management"
• "What's my market timing like?"
• "Predict my future performance"

What specific aspect of your trading would you like to explore? I'm here to help you improve! 🚀`;
  }

  // Helper methods
  private groupTradesByHour(trades: Trade[]) {
    const hourlyStats: Record<string, { count: number; wins: number; winRate: number }> = {};

    trades.forEach(trade => {
      if (trade.openTime) {
        const hour = new Date(trade.openTime).getHours();
        const hourStr = hour.toString().padStart(2, '0') + ':00';

        if (!hourlyStats[hourStr]) {
          hourlyStats[hourStr] = { count: 0, wins: 0, winRate: 0 };
        }

        hourlyStats[hourStr].count++;
        if (trade.outcome === 'Win') {
          hourlyStats[hourStr].wins++;
        }
      }
    });

    // Calculate win rates
    Object.keys(hourlyStats).forEach(hour => {
      const stats = hourlyStats[hour];
      stats.winRate = stats.count > 0 ? stats.wins / stats.count : 0;
    });

    return hourlyStats;
  }

  private groupTradesBySize(trades: Trade[]) {
    const sizeGroups: Record<string, { count: number; wins: number; winRate: number }> = {
      'Small (0-0.01)': { count: 0, wins: 0, winRate: 0 },
      'Medium (0.01-0.1)': { count: 0, wins: 0, winRate: 0 },
      'Large (0.1+)': { count: 0, wins: 0, winRate: 0 }
    };

    trades.forEach(trade => {
      const rawSize = trade.lotSize;
      let size = 0;

      if (typeof rawSize === 'string') {
        const numSize = parseFloat(rawSize);
        size = isNaN(numSize) ? 0 : numSize;
      } else if (typeof rawSize === 'number') {
        size = rawSize;
      }

      let group = 'Small (0-0.01)';

      if (size >= 0.1) group = 'Large (0.1+)';
      else if (size >= 0.01) group = 'Medium (0.01-0.1)';

      sizeGroups[group].count++;
      if (trade.outcome === 'Win') {
        sizeGroups[group].wins++;
      }
    });

    // Calculate win rates
    Object.keys(sizeGroups).forEach(group => {
      const stats = sizeGroups[group];
      stats.winRate = stats.count > 0 ? stats.wins / stats.count : 0;
    });

    return sizeGroups;
  }

  private groupTradesBySymbol(trades: Trade[]) {
    const symbolStats: Record<string, { count: number; wins: number; winRate: number; pnl: number }> = {};

    trades.forEach(trade => {
      const symbol = trade.symbol || 'UNKNOWN';

      if (!symbolStats[symbol]) {
        symbolStats[symbol] = { count: 0, wins: 0, winRate: 0, pnl: 0 };
      }

      symbolStats[symbol].count++;
      symbolStats[symbol].pnl += trade.pnl || 0;
      if (trade.outcome === 'Win') {
        symbolStats[symbol].wins++;
      }
    });

    // Calculate win rates
    Object.keys(symbolStats).forEach(symbol => {
      const stats = symbolStats[symbol];
      stats.winRate = stats.count > 0 ? stats.wins / stats.count : 0;
    });

    return symbolStats;
  }

  private calculateMaxDrawdown(trades: Trade[]): number {
    if (trades.length === 0) return 0;

    let peak = 0;
    let maxDrawdown = 0;
    let runningTotal = 0;

    for (const trade of trades) {
      runningTotal += trade.pnl || 0;

      if (runningTotal > peak) {
        peak = runningTotal;
      }

      const drawdown = peak - runningTotal;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  private calculateProfitFactor(trades: Trade[]): number {
    const profits = trades
      .filter(t => (t.pnl || 0) > 0)
      .reduce((sum, t) => sum + (t.pnl || 0), 0);

    const losses = Math.abs(trades
      .filter(t => (t.pnl || 0) < 0)
      .reduce((sum, t) => sum + (t.pnl || 0), 0));

    return losses > 0 ? profits / losses : profits > 0 ? 3.0 : 0.5;
  }
}

export const aiService = AIService.getInstance();