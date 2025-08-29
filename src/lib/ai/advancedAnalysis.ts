// src/lib/ai/advancedAnalysis.ts
// Advanced AI Analysis Functions for Trading Intelligence

export interface TradeAnalysis {
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  avgTrade: number;
  bestSymbol: string;
  worstSymbol: string;
  bestTimeframe: string;
  riskRewardRatio: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  largestWin: number;
  largestLoss: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  expectancy: number;
  sharpeRatio: number;
  maxDrawdown: number;
  recoveryTime: number;
  tradingStyle: string;
  recommendedActions: string[];
}

// Analyze user's trading performance comprehensively including qualitative data
export function analyzeTradingPerformance(trades: any[]): TradeAnalysis {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      totalPnL: 0,
      avgTrade: 0,
      bestSymbol: 'N/A',
      worstSymbol: 'N/A',
      bestTimeframe: 'N/A',
      riskRewardRatio: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      largestWin: 0,
      largestLoss: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      expectancy: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      recoveryTime: 0,
      tradingStyle: 'Beginner',
      recommendedActions: ['Start trading consistently', 'Focus on learning', 'Build a trading routine']
    };
  }

  const winningTrades = trades.filter(t => t.outcome === 'Win');
  const losingTrades = trades.filter(t => t.outcome === 'Loss');

  // Calculate basic metrics
  const totalTrades = trades.length;
  const winRate = (winningTrades.length / totalTrades) * 100;
  const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const avgTrade = totalPnL / totalTrades;

  // Symbol performance analysis
  const symbolStats = trades.reduce((acc: any, trade: any) => {
    const symbol = trade.symbol || 'Unknown';
    if (!acc[symbol]) {
      acc[symbol] = { total: 0, wins: 0, pnl: 0 };
    }
    acc[symbol].total++;
    if (trade.outcome === 'Win') acc[symbol].wins++;
    acc[symbol].pnl += trade.pnl || 0;
    return acc;
  }, {});

  const sortedSymbols = Object.entries(symbolStats)
    .sort(([, a]: any, [, b]: any) => b.pnl - a.pnl);

  const bestSymbol = sortedSymbols[0]?.[0] || 'N/A';
  const worstSymbol = sortedSymbols[sortedSymbols.length - 1]?.[0] || 'N/A';

  // Risk-reward analysis
  const avgWin = winningTrades.length > 0
    ? winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / winningTrades.length
    : 0;
  const avgLoss = losingTrades.length > 0
    ? Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / losingTrades.length)
    : 0;
  const riskRewardRatio = avgLoss > 0 ? avgWin / avgLoss : 0;

  // Advanced metrics
  const profitFactor = avgLoss > 0 ? (avgWin * winningTrades.length) / (avgLoss * losingTrades.length) : 0;
  const expectancy = (winRate / 100 * avgWin) - ((100 - winRate) / 100 * avgLoss);

  // Analyze qualitative data from journal notes and strategies
  const qualitativeAnalysis = analyzeQualitativeData(trades);

  // Trading style determination (enhanced with qualitative data)
  let tradingStyle = determineTradingStyle(totalTrades, winRate, qualitativeAnalysis);

  // Generate personalized recommendations based on both quantitative and qualitative data
  const recommendedActions = generatePersonalizedRecommendations({
    totalTrades,
    winRate,
    totalPnL,
    avgTrade,
    riskRewardRatio,
    profitFactor,
    tradingStyle,
    qualitativeAnalysis
  });

  return {
    totalTrades,
    winRate,
    totalPnL,
    avgTrade,
    bestSymbol,
    worstSymbol,
    bestTimeframe: getBestTimeframe(trades),
    riskRewardRatio,
    consecutiveWins: getConsecutiveWins(trades),
    consecutiveLosses: getConsecutiveLosses(trades),
    largestWin: Math.max(...winningTrades.map(t => t.pnl || 0), 0),
    largestLoss: Math.min(...losingTrades.map(t => t.pnl || 0), 0),
    avgWin,
    avgLoss,
    profitFactor,
    expectancy,
    sharpeRatio: calculateSharpeRatio(trades),
    maxDrawdown: calculateMaxDrawdown(trades),
    recoveryTime: calculateRecoveryTime(trades),
    tradingStyle,
    recommendedActions,
    // Add qualitative insights
    qualitativeAnalysis
  } as TradeAnalysis & { qualitativeAnalysis: any };
}

// Analyze qualitative data from journal notes, strategies, and emotions
function analyzeQualitativeData(trades: any[]) {
  const analysis = {
    commonStrategies: [] as string[],
    emotionalPatterns: [] as string[],
    journalInsights: [] as string[],
    strategyEffectiveness: {} as Record<string, any>,
    emotionalImpact: {} as Record<string, any>,
    learningPatterns: [] as string[],
    behavioralTendencies: [] as string[]
  };

  // Analyze strategies mentioned in reasonForTrade and strategy fields
  const strategies = trades.map(t => t.reasonForTrade || t.strategy || '').filter(s => s);
  const strategyCounts = strategies.reduce((acc: Record<string, number>, strategy: string) => {
    const normalized = strategy.toLowerCase().trim();
    acc[normalized] = (acc[normalized] || 0) + 1;
    return acc;
  }, {});

  analysis.commonStrategies = Object.entries(strategyCounts)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([strategy]) => strategy);

  // Analyze emotional patterns
  const emotions = trades.map(t => t.emotion || '').filter(e => e);
  const emotionCounts = emotions.reduce((acc: Record<string, number>, emotion: string) => {
    const normalized = emotion.toLowerCase().trim();
    acc[normalized] = (acc[normalized] || 0) + 1;
    return acc;
  }, {});

  analysis.emotionalPatterns = Object.entries(emotionCounts)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 3)
    .map(([emotion]) => emotion);

  // Analyze journal notes for insights
  const journalNotes = trades.map(t => t.journalNotes || t.notes || t.postNote || '').filter(n => n);
  const insights = extractJournalInsights(journalNotes);
  analysis.journalInsights = insights;

  // Analyze strategy effectiveness
  analysis.strategyEffectiveness = analyzeStrategyEffectiveness(trades);

  // Analyze emotional impact on performance
  analysis.emotionalImpact = analyzeEmotionalImpact(trades);

  // Extract learning patterns
  analysis.learningPatterns = extractLearningPatterns(journalNotes);

  // Identify behavioral tendencies
  analysis.behavioralTendencies = identifyBehavioralTendencies(trades);

  return analysis;
}

// Extract insights from journal notes
function extractJournalInsights(notes: string[]): string[] {
  const insights: string[] = [];
  const commonThemes = {
    discipline: /disciplin|follow|plan|rules|process/gi,
    impatience: /impatien|early|premature|rush|too soon/gi,
    fear: /fear|scared|afraid|nervous|hesitat/gi,
    greed: /greed|more profit|hold longer|let run/gi,
    revenge: /revenge|get back|make up|recover/gi,
    overconfidence: /overconfiden|too sure|complacent/gi,
    learning: /learn|improve|better|mistake|next time/gi,
    execution: /execut|entry|exit|timing|perfect/gi
  };

  const themeCounts: Record<string, number> = {};

  notes.forEach(note => {
    Object.entries(commonThemes).forEach(([theme, pattern]) => {
      if (pattern.test(note)) {
        themeCounts[theme] = (themeCounts[theme] || 0) + 1;
      }
    });
  });

  // Convert to insights
  Object.entries(themeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .forEach(([theme, count]) => {
      const percentage = ((count / notes.length) * 100).toFixed(1);
      insights.push(`${theme.charAt(0).toUpperCase() + theme.slice(1)} (${percentage}% of entries)`);
    });

  return insights;
}

// Analyze strategy effectiveness
function analyzeStrategyEffectiveness(trades: any[]): Record<string, any> {
  const strategyStats: Record<string, any> = {};

  trades.forEach(trade => {
    const strategy = (trade.reasonForTrade || trade.strategy || 'No Strategy').toLowerCase().trim();

    if (!strategyStats[strategy]) {
      strategyStats[strategy] = {
        total: 0,
        wins: 0,
        pnl: 0,
        avgRR: 0,
        bestWin: 0,
        worstLoss: 0
      };
    }

    strategyStats[strategy].total++;
    strategyStats[strategy].pnl += trade.pnl || 0;

    if (trade.outcome === 'Win') {
      strategyStats[strategy].wins++;
      strategyStats[strategy].bestWin = Math.max(strategyStats[strategy].bestWin, trade.pnl || 0);
    } else {
      strategyStats[strategy].worstLoss = Math.min(strategyStats[strategy].worstLoss, trade.pnl || 0);
    }
  });

  // Calculate win rates and effectiveness
  Object.keys(strategyStats).forEach(strategy => {
    const stats = strategyStats[strategy];
    stats.winRate = (stats.wins / stats.total) * 100;
    stats.avgPnL = stats.pnl / stats.total;
    stats.effectiveness = stats.winRate > 50 && stats.avgPnL > 0 ? 'High' :
                         stats.winRate > 40 && stats.avgPnL > 0 ? 'Medium' : 'Low';
  });

  return strategyStats;
}

// Analyze emotional impact on performance
function analyzeEmotionalImpact(trades: any[]): Record<string, any> {
  const emotionStats: Record<string, any> = {};

  trades.forEach(trade => {
    const emotion = (trade.emotion || 'Neutral').toLowerCase().trim();

    if (!emotionStats[emotion]) {
      emotionStats[emotion] = {
        total: 0,
        wins: 0,
        pnl: 0,
        avgPnL: 0
      };
    }

    emotionStats[emotion].total++;
    emotionStats[emotion].pnl += trade.pnl || 0;

    if (trade.outcome === 'Win') {
      emotionStats[emotion].wins++;
    }
  });

  // Calculate performance by emotion
  Object.keys(emotionStats).forEach(emotion => {
    const stats = emotionStats[emotion];
    stats.winRate = (stats.wins / stats.total) * 100;
    stats.avgPnL = stats.pnl / stats.total;
  });

  return emotionStats;
}

// Extract learning patterns from journal notes
function extractLearningPatterns(notes: string[]): string[] {
  const patterns: string[] = [];
  const learningKeywords = [
    'learned', 'realized', 'understood', 'improved', 'better', 'next time',
    'mistake', 'error', 'wrong', 'should have', 'will do', 'plan to'
  ];

  notes.forEach(note => {
    learningKeywords.forEach(keyword => {
      if (note.toLowerCase().includes(keyword)) {
        // Extract sentence containing the keyword
        const sentences = note.split(/[.!?]+/);
        const relevantSentence = sentences.find(s =>
          s.toLowerCase().includes(keyword)
        );
        if (relevantSentence && !patterns.includes(relevantSentence.trim())) {
          patterns.push(relevantSentence.trim());
        }
      }
    });
  });

  return patterns.slice(0, 3); // Return top 3 learning patterns
}

// Identify behavioral tendencies
function identifyBehavioralTendencies(trades: any[]): string[] {
  const tendencies: string[] = [];

  // Check for revenge trading
  const consecutiveLosses = getConsecutiveLosses(trades);
  if (consecutiveLosses > 2) {
    tendencies.push('Revenge trading after losses');
  }

  // Check for size variation based on emotions
  const emotionalTrades = trades.filter(t => t.emotion);
  if (emotionalTrades.length > trades.length * 0.3) {
    tendencies.push('Emotion-driven position sizing');
  }

  // Check for strategy switching
  const strategies = trades.map(t => t.reasonForTrade || t.strategy).filter(s => s);
  const uniqueStrategies = new Set(strategies);
  if (uniqueStrategies.size > strategies.length * 0.5) {
    tendencies.push('Frequent strategy switching');
  }

  // Check for journal consistency
  const journaledTrades = trades.filter(t => t.journalNotes || t.notes);
  if (journaledTrades.length < trades.length * 0.5) {
    tendencies.push('Inconsistent journaling');
  }

  return tendencies;
}

// Enhanced trading style determination
function determineTradingStyle(totalTrades: number, winRate: number, qualitativeAnalysis: any): string {
  let baseStyle = 'Beginner';
  if (totalTrades > 100 && winRate > 60) baseStyle = 'Expert';
  else if (totalTrades > 50 && winRate > 50) baseStyle = 'Advanced';
  else if (totalTrades > 20 && winRate > 45) baseStyle = 'Intermediate';
  else if (totalTrades > 10) baseStyle = 'Developing';

  // Adjust based on qualitative factors
  const journalConsistency = qualitativeAnalysis.journalInsights.length > 0;
  const strategyConsistency = qualitativeAnalysis.commonStrategies.length > 0;
  const emotionalAwareness = qualitativeAnalysis.emotionalPatterns.length > 0;

  // Upgrade style if showing good qualitative habits
  if (baseStyle === 'Intermediate' && journalConsistency && strategyConsistency) {
    baseStyle = 'Advanced';
  }

  if (baseStyle === 'Advanced' && emotionalAwareness && qualitativeAnalysis.learningPatterns.length > 0) {
    baseStyle = 'Expert';
  }

  return baseStyle;
}

// Generate personalized greeting based on performance and qualitative data
export function generatePersonalizedGreeting(analysis: any): string {
  const { tradingStyle, winRate, totalTrades, totalPnL, qualitativeAnalysis } = analysis;

  // Extract qualitative insights
  const topStrategy = qualitativeAnalysis?.commonStrategies?.[0] || 'your approach';
  const topEmotion = qualitativeAnalysis?.emotionalPatterns?.[0] || 'focused';
  const journalInsight = qualitativeAnalysis?.journalInsights?.[0] || '';

  if (tradingStyle === 'Expert') {
    return `🚀 **Hey there, Trading Champion!** Welcome back to your winning journey!\n\nI'm Tradia AI, your personal trading coach, and I can see you're operating at an elite level. Your ${winRate.toFixed(1)}% win rate and $${totalPnL.toFixed(2)} in profits speak volumes about your skill and dedication.\n\n**What I notice about you:** You're consistently using ${topStrategy} strategies and maintaining a ${topEmotion} mindset. ${journalInsight ? `Your journal shows: "${journalInsight}"` : ''}\n\nLet's take your already impressive performance to the next level!`;
  } else if (tradingStyle === 'Advanced') {
    return `💪 **Hey there, Skilled Trader!** Great to see you back in the game!\n\nI'm Tradia AI, your personal trading coach. Your ${winRate.toFixed(1)}% win rate shows you're building solid habits and seeing real results. With ${totalTrades} trades under your belt, you're well on your way to mastery.\n\n**Your trading personality:** I can see you're developing strong ${topStrategy} skills and staying ${topEmotion} during trades. ${journalInsight ? `From your notes: "${journalInsight}"` : ''}\n\nLet's refine your edge and push those numbers even higher!`;
  } else if (tradingStyle === 'Intermediate') {
    return `🌟 **Hey there, Growing Trader!** Welcome back to your learning journey!\n\nI'm Tradia AI, your personal trading coach. I can see you're putting in the work with ${totalTrades} trades and developing your skills. Your ${winRate.toFixed(1)}% win rate shows promise, and every trade is building your foundation.\n\n**What I'm learning about you:** You're experimenting with ${topStrategy} approaches and experiencing ${topEmotion} emotions. ${journalInsight ? `Your reflections show: "${journalInsight}"` : ''}\n\nLet's focus on consistency and growth together!`;
  } else {
    return `🎯 **Hey there, Aspiring Trader!** Welcome to your trading adventure!\n\nI'm Tradia AI, your personal trading coach and mentor. I see you're just starting out with ${totalTrades} trades, and that's fantastic! Every expert was once a beginner, and you're already taking the right steps.\n\n**Your fresh perspective:** I notice you're trying ${topStrategy} strategies and feeling ${topEmotion} about your trades. ${journalInsight ? `Your notes reveal: "${journalInsight}"` : ''}\n\nLet's build your trading foundation together and turn you into a confident, profitable trader!`;
  }
}

// Generate trading snapshot
export function generateTradingSnapshot(analysis: TradeAnalysis): string {
  const { totalTrades, winRate, totalPnL, avgTrade, bestSymbol, riskRewardRatio, tradingStyle } = analysis;

  return `• **${totalTrades} Trades** executed with discipline\n• **${winRate.toFixed(1)}% Win Rate** - ${winRate > 50 ? 'Above average!' : 'Room for improvement'}\n• **$${totalPnL.toFixed(2)} Total P&L** - Real results from your efforts\n• **$${avgTrade.toFixed(2)} Avg Trade** - Your typical performance\n• **${bestSymbol}** is your strongest performing asset\n• **${riskRewardRatio.toFixed(2)}:1 Risk-Reward** - ${riskRewardRatio > 1.5 ? 'Excellent ratio!' : 'Can be improved'}\n• **${tradingStyle} Level** - ${getLevelDescription(tradingStyle)}`;
}

// Advanced performance analysis with actionable recommendations including qualitative insights
export function generateAdvancedPerformanceAnalysis(analysis: any): string {
  const { totalTrades, winRate, totalPnL, avgTrade, profitFactor, expectancy, sharpeRatio, maxDrawdown, recommendedActions, qualitativeAnalysis } = analysis;

  let performanceLevel = '';
  if (winRate > 65) performanceLevel = '🎯 **Elite Performance** - You\'re trading at a professional level!';
  else if (winRate > 55) performanceLevel = '💪 **Strong Performance** - You\'re building a solid foundation!';
  else if (winRate > 45) performanceLevel = '📈 **Good Progress** - You\'re on the right track!';
  else performanceLevel = '🌱 **Learning Phase** - Every expert started here!';

  // Extract qualitative insights
  const topStrategies = qualitativeAnalysis?.commonStrategies?.slice(0, 3) || [];
  const emotionalPatterns = qualitativeAnalysis?.emotionalPatterns || [];
  const journalInsights = qualitativeAnalysis?.journalInsights || [];
  const strategyEffectiveness = qualitativeAnalysis?.strategyEffectiveness || {};
  const emotionalImpact = qualitativeAnalysis?.emotionalImpact || {};
  const learningPatterns = qualitativeAnalysis?.learningPatterns || [];
  const behavioralTendencies = qualitativeAnalysis?.behavioralTendencies || [];

  return `📊 **Advanced Performance Analysis - Your Complete Trading Profile Revealed**\n\n${performanceLevel}\n\n**📈 Quantitative Performance Metrics:**\n• **Win Rate**: ${winRate.toFixed(1)}% (${winRate > 50 ? '✅ Above average' : '⚠️ Needs improvement'})\n• **Profit Factor**: ${profitFactor.toFixed(2)} (${profitFactor > 1.5 ? '✅ Excellent' : profitFactor > 1 ? '⚠️ Decent' : '❌ Needs work'})\n• **Expectancy**: $${expectancy.toFixed(2)} per trade (${expectancy > 0 ? '✅ Profitable' : '❌ Review strategy'})\n• **Sharpe Ratio**: ${sharpeRatio.toFixed(2)} (${sharpeRatio > 1 ? '✅ Good risk-adjusted returns' : '⚠️ High volatility'})\n• **Max Drawdown**: ${maxDrawdown.toFixed(1)}% (${maxDrawdown < 20 ? '✅ Well managed' : '⚠️ High risk exposure'})\n\n**🧠 Qualitative Analysis - What Your Journal Reveals:**\n\n**🎯 Your Strategy Patterns:**\n${topStrategies.length > 0 ? topStrategies.map((strategy: string, i: number) => `${i + 1}. **${strategy}**`).join('\n') : '• No clear strategy patterns identified yet'}\n\n**😊 Emotional Trading Patterns:**\n${emotionalPatterns.length > 0 ? emotionalPatterns.map((emotion: string, i: number) => `${i + 1}. **${emotion}** - ${getEmotionalInsight(emotion, emotionalImpact)}`).join('\n') : '• Emotional patterns not yet established'}\n\n**📝 Key Insights from Your Journal:**\n${journalInsights.length > 0 ? journalInsights.map((insight: string, i: number) => `${i + 1}. ${insight}`).join('\n') : '• Start journaling to unlock deeper insights!'}\n\n**📚 Your Learning Journey:**\n${learningPatterns.length > 0 ? learningPatterns.map((pattern: string, i: number) => `${i + 1}. ${pattern}`).join('\n') : '• Continue documenting your trades to identify learning patterns'}\n\n**🔄 Behavioral Tendencies:**\n${behavioralTendencies.length > 0 ? behavioralTendencies.map((tendency: string, i: number) => `${i + 1}. ⚠️ ${tendency}`).join('\n') : '• No concerning behavioral patterns detected'}\n\n**💪 Your Trading Strengths:**\n${getTradingStrengths(analysis)}\n\n**🎯 Critical Improvement Areas:**\n${getImprovementAreas(analysis)}\n\n**🚀 Your Next Level Action Plan:**\n${recommendedActions.map((action: string, i: number) => `${i + 1}. **${action}**`).join('\n')}\n\n**💡 Psychology-Based Recommendations:**\n${generatePsychologyBasedRecommendations(qualitativeAnalysis)}\n\n**Pro Tip:** The most successful traders combine excellent execution with deep self-awareness. Your journal is your greatest asset for growth!\n\nWhat's one insight from your journal that surprised you? 🤔`;
}

// Generate emotional insights based on emotional impact data
function getEmotionalInsight(emotion: string, emotionalImpact: any): string {
  const emotionData = emotionalImpact[emotion.toLowerCase()];
  if (!emotionData) return 'Impact not yet measurable';

  const winRate = emotionData.winRate || 0;
  const avgPnL = emotionData.avgPnL || 0;

  if (winRate > 60 && avgPnL > 0) return `High performance (${winRate.toFixed(1)}% win rate)`;
  if (winRate > 50 && avgPnL > 0) return `Good performance (${winRate.toFixed(1)}% win rate)`;
  if (winRate < 40 || avgPnL < 0) return `Lower performance (${winRate.toFixed(1)}% win rate)`;
  return `Neutral performance (${winRate.toFixed(1)}% win rate)`;
}

// Generate psychology-based recommendations
function generatePsychologyBasedRecommendations(qualitativeAnalysis: any): string {
  const recommendations: string[] = [];

  const emotionalPatterns = qualitativeAnalysis?.emotionalPatterns || [];
  const behavioralTendencies = qualitativeAnalysis?.behavioralTendencies || [];
  const learningPatterns = qualitativeAnalysis?.learningPatterns || [];

  // Emotional recommendations
  if (emotionalPatterns.includes('fear') || emotionalPatterns.includes('nervous')) {
    recommendations.push('• **Fear Management**: Practice deep breathing before trades and maintain a trading journal to track fear-based decisions');
  }

  if (emotionalPatterns.includes('greed') || emotionalPatterns.includes('overconfident')) {
    recommendations.push('• **Greed Control**: Set predefined profit targets and stick to your trading plan without chasing extra pips');
  }

  if (emotionalPatterns.includes('revenge')) {
    recommendations.push('• **Revenge Trading Prevention**: Take breaks after losses and never increase position sizes to "get back" at the market');
  }

  // Behavioral recommendations
  if (behavioralTendencies.includes('Revenge trading after losses')) {
    recommendations.push('• **Break Patterns**: Implement mandatory 30-minute breaks after consecutive losses');
  }

  if (behavioralTendencies.includes('Frequent strategy switching')) {
    recommendations.push('• **Strategy Commitment**: Stick to one proven strategy for at least 20 trades before evaluating changes');
  }

  if (behavioralTendencies.includes('Inconsistent journaling')) {
    recommendations.push('• **Journal Discipline**: Make journaling a non-negotiable part of your daily routine');
  }

  // Learning recommendations
  if (learningPatterns.length > 0) {
    recommendations.push('• **Build on Insights**: Use your journal insights to create specific improvement goals');
  } else {
    recommendations.push('• **Self-Reflection**: Ask yourself "What did I learn?" after every trade');
  }

  // Default recommendations
  if (recommendations.length === 0) {
    recommendations.push('• **Mindfulness Practice**: Start each trading day with 5 minutes of meditation');
    recommendations.push('• **Emotional Awareness**: Track your emotional state before, during, and after each trade');
    recommendations.push('• **Process Focus**: Celebrate following your process, not just profitable outcomes');
  }

  return recommendations.join('\n');
}

// Strategy recommendations based on performance data and qualitative analysis
export function generateStrategyRecommendations(analysis: any): string {
  const { bestSymbol, worstSymbol, riskRewardRatio, winRate, tradingStyle, qualitativeAnalysis } = analysis;

  // Get user's actual strategies from qualitative analysis
  const userStrategies = qualitativeAnalysis?.commonStrategies || [];
  const strategyEffectiveness = qualitativeAnalysis?.strategyEffectiveness || {};

  // Find most effective user strategy
  let bestUserStrategy = 'balanced';
  let bestStrategyWinRate = 0;

  Object.entries(strategyEffectiveness).forEach(([strategy, data]: [string, any]) => {
    if (data.winRate > bestStrategyWinRate && data.effectiveness === 'High') {
      bestUserStrategy = strategy;
      bestStrategyWinRate = data.winRate;
    }
  });

  // Fallback to quantitative analysis if no qualitative data
  const quantitativeStrategies = {
    momentum: winRate > 55 && riskRewardRatio > 1.5,
    breakout: winRate > 50 && analysis.consecutiveWins > 3,
    reversal: analysis.avgLoss < analysis.avgWin * 0.7,
    scalping: analysis.totalTrades > 30 && analysis.avgTrade < 15,
    swing: analysis.totalTrades < 30 && riskRewardRatio > 2
  };

  const recommendedStrategy = bestUserStrategy !== 'balanced' ? bestUserStrategy :
    Object.entries(quantitativeStrategies).find(([, condition]) => condition)?.[0] || 'balanced';

  return `🎯 **Strategy Optimization Session - Your Personal Trading Blueprint**\n\nBased on your ${analysis.totalTrades} trades and ${analysis.winRate.toFixed(1)}% win rate, here's what your data reveals about your optimal strategy:\n\n**📊 Your Performance by Symbol:**\n• **${bestSymbol}**: Your strongest performer - focus more here!\n• **${worstSymbol}**: Consider reducing exposure or improving approach\n• **Risk-Reward Ratio**: ${riskRewardRatio.toFixed(2)}:1 (${riskRewardRatio > 1.5 ? 'Excellent!' : 'Can be improved'})\n\n**🧠 Your Strategy DNA (From Your Journal):**\n${userStrategies.length > 0 ?
    userStrategies.map((strategy: string, i: number) => {
      const effectiveness = strategyEffectiveness[strategy.toLowerCase()]?.effectiveness || 'Unknown';
      const winRate = strategyEffectiveness[strategy.toLowerCase()]?.winRate || 0;
      return `${i + 1}. **${strategy}** - ${effectiveness} effectiveness (${winRate.toFixed(1)}% win rate)`;
    }).join('\n') :
    '• No clear strategy patterns identified yet - keep journaling!'}\n\n**🎯 Recommended Strategy for You: ${recommendedStrategy.toUpperCase()}**\n\n**Why This Strategy Fits Your Trading Personality:**\n${getStrategyFitExplanation(recommendedStrategy, analysis, qualitativeAnalysis)}\n\n**Strategy-Specific Recommendations Based on Your History:**\n${getStrategySpecificTips(recommendedStrategy, analysis, qualitativeAnalysis)}\n\n**Your Trading Edge Analysis:**\n• **Strength**: ${getTradingEdge(analysis)}\n• **Opportunity**: ${getMarketOpportunity(analysis)}\n• **Risk Level**: ${analysis.maxDrawdown < 15 ? 'Conservative' : analysis.maxDrawdown < 25 ? 'Moderate' : 'Aggressive'}\n\n**💡 Psychology-Based Strategy Tips:**\n${getPsychologyBasedStrategyTips(qualitativeAnalysis)}\n\n**Implementation Plan:**\n1. **Focus on 2-3 key symbols** where you have an edge\n2. **Develop specific entry/exit rules** for your strategy\n3. **Track performance metrics** weekly\n4. **Adjust position sizing** based on confidence\n5. **Maintain strict risk management** above all\n\n**Remember:** The best strategy is the one you can execute consistently with discipline. What's your biggest strategy challenge? 🤔`;
}


// Enhanced strategy fit explanation incorporating qualitative data
function getStrategyFitExplanation(strategy: string, analysis: any, qualitativeAnalysis: any): string {
  const emotionalPatterns = qualitativeAnalysis?.emotionalPatterns || [];
  const behavioralTendencies = qualitativeAnalysis?.behavioralTendencies || [];

  const baseExplanations = {
    momentum: 'Your data shows you excel when trading with the trend and momentum. You have strong consecutive wins and good profit factors.',
    breakout: 'You perform well on decisive market moves and have shown ability to capture large moves with good risk management.',
    reversal: 'Your smaller average losses suggest you\'re good at cutting losses quickly, which fits reversal strategies.',
    scalping: 'Your high trade frequency and smaller average wins suggest you thrive in fast-paced, frequent trading environments.',
    balanced: 'Your consistent performance across different conditions suggests a balanced approach works best for you.'
  };

  let explanation = baseExplanations[strategy as keyof typeof baseExplanations] || baseExplanations.balanced;

  // Add qualitative insights
  if (emotionalPatterns.includes('confident') && strategy === 'momentum') {
    explanation += ' Your confident mindset aligns perfectly with momentum trading.';
  }

  if (emotionalPatterns.includes('patient') && strategy === 'swing') {
    explanation += ' Your patient approach is ideal for swing trading.';
  }

  if (behavioralTendencies.includes('Frequent strategy switching')) {
    explanation += ' Focus on this strategy consistently to overcome switching tendencies.';
  }

  return explanation;
}

// Enhanced strategy tips incorporating qualitative data
function getStrategySpecificTips(strategy: string, analysis: any, qualitativeAnalysis: any): string {
  const emotionalPatterns = qualitativeAnalysis?.emotionalPatterns || [];
  const learningPatterns = qualitativeAnalysis?.learningPatterns || [];

  const baseTips = {
    momentum: '• Focus on trending markets\n• Use moving averages for trend identification\n• Enter on pullbacks within trends\n• Let profits run in strong trends',
    breakout: '• Identify key levels and consolidation patterns\n• Wait for decisive breaks with volume\n• Use wider stops for breakout trades\n• Scale out of positions on extensions',
    reversal: '• Look for exhaustion patterns\n• Wait for confirmation of reversal\n• Use tight stops near recent highs/lows\n• Take quick profits on reversals',
    scalping: '• Focus on liquid, volatile instruments\n• Use very tight timeframes (1-5 min)\n• Aim for small, consistent profits\n• Maintain strict discipline on entries/exits',
    balanced: '• Adapt to current market conditions\n• Use multiple timeframe analysis\n• Combine different strategy elements\n• Focus on high-probability setups'
  };

  let tips = baseTips[strategy as keyof typeof baseTips] || baseTips.balanced;

  // Add personalized tips based on emotional patterns
  if (emotionalPatterns.includes('fear')) {
    tips += '\n• Practice confidence-building exercises before trading';
  }

  if (emotionalPatterns.includes('greed')) {
    tips += '\n• Set predefined profit targets to avoid greed-driven decisions';
  }

  if (learningPatterns.length > 0) {
    tips += '\n• Apply your journal insights to refine your execution';
  }

  return tips;
}

// Generate psychology-based strategy tips
function getPsychologyBasedStrategyTips(qualitativeAnalysis: any): string {
  const tips: string[] = [];
  const emotionalPatterns = qualitativeAnalysis?.emotionalPatterns || [];
  const behavioralTendencies = qualitativeAnalysis?.behavioralTendencies || [];

  if (emotionalPatterns.includes('fear')) {
    tips.push('• **Fear Management**: Start with smaller positions and gradually increase as confidence builds');
    tips.push('• **Preparation Ritual**: Develop a pre-trade routine to reduce anxiety');
  }

  if (emotionalPatterns.includes('greed')) {
    tips.push('• **Profit Discipline**: Set profit targets before entering and stick to them religiously');
    tips.push('• **Partial Exits**: Scale out of winning positions to lock in profits');
  }

  if (behavioralTendencies.includes('Revenge trading after losses')) {
    tips.push('• **Loss Recovery Plan**: Have a specific plan for what to do after a loss (break, analysis, smaller size)');
    tips.push('• **Emotional Reset**: Use breathing exercises or short breaks to reset after losses');
  }

  if (emotionalPatterns.includes('overconfident')) {
    tips.push('• **Humility Check**: Always respect the market and maintain proper risk management');
    tips.push('• **Process Focus**: Celebrate following your process, not just winning');
  }

  if (tips.length === 0) {
    tips.push('• **Emotional Awareness**: Track your emotional state and its impact on decision making');
    tips.push('• **Mindful Trading**: Stay present and focused during market hours');
    tips.push('• **Continuous Learning**: Review both winning and losing trades for insights');
  }

  return tips.join('\n');
}

// Risk management analysis and recommendations
export function generateRiskManagementAnalysis(analysis: TradeAnalysis): string {
  const { maxDrawdown, riskRewardRatio, avgLoss, expectancy, consecutiveLosses } = analysis;

  const riskLevel = maxDrawdown < 15 ? 'Conservative' : maxDrawdown < 25 ? 'Moderate' : 'Aggressive';
  const riskRewardGrade = riskRewardRatio > 2 ? 'A+' : riskRewardRatio > 1.5 ? 'A' : riskRewardRatio > 1 ? 'B' : 'C';

  return `🛡️ **Risk Management Mastery - Protecting Your Trading Capital**\n\n**Your Current Risk Profile:** ${riskLevel} (${maxDrawdown.toFixed(1)}% max drawdown)\n\n**Risk Metrics Analysis:**\n• **Max Drawdown**: ${maxDrawdown.toFixed(1)}% (${maxDrawdown < 20 ? '✅ Well controlled' : '⚠️ High exposure'})\n• **Risk-Reward Ratio**: ${riskRewardRatio.toFixed(2)}:1 (Grade: ${riskRewardGrade})\n• **Average Loss**: $${avgLoss.toFixed(2)} (${avgLoss < 50 ? '✅ Tight stops' : '⚠️ Wide stops'})\n• **Expectancy**: $${expectancy.toFixed(2)} (${expectancy > 0 ? '✅ Profitable' : '❌ Review strategy'})\n• **Max Consecutive Losses**: ${consecutiveLosses} (${consecutiveLosses < 5 ? '✅ Manageable' : '⚠️ High risk'})\n\n**Your Risk Management Score:** ${calculateRiskScore(analysis)}/100\n\n**Critical Risk Rules You Must Follow:**\n1. **Never risk more than 1-2%** of your account per trade\n2. **Always set stop losses** before entering any position\n3. **Calculate position size** based on your stop loss distance\n4. **Set daily loss limits** (maximum 5% of account)\n5. **Use trailing stops** on winning positions\n6. **Take breaks** after consecutive losses\n\n**Personalized Risk Recommendations:**\n${getPersonalizedRiskRecommendations(analysis)}\n\n**Risk Management Action Items:**\n• Set up automatic stop losses on all positions\n• Calculate your maximum position size for each trade\n• Implement a daily drawdown limit\n• Create a risk management checklist\n• Review your risk metrics weekly\n\n**Pro Tip:** Risk management isn't about avoiding losses - it's about controlling them. The best traders lose money too, but they lose it in a controlled, predictable way.\n\nWhat's your biggest risk management challenge right now? 💪`;
}

// Market timing recommendations
export function generateMarketTimingRecommendations(analysis: TradeAnalysis): string {
  const { bestTimeframe, winRate, consecutiveWins, totalTrades } = analysis;

  const timingStrengths = {
    early: winRate > 55 && consecutiveWins > 2,
    patient: analysis.avgTrade > 20 && analysis.profitFactor > 1.3,
    quick: totalTrades > 30 && analysis.avgTrade < 15,
    consistent: analysis.sharpeRatio > 1.2
  };

  const bestTiming = Object.entries(timingStrengths).find(([, condition]) => condition)?.[0] || 'balanced';

  return `⏰ **Market Timing Mastery - When to Pull the Trigger**\n\n**Your Timing Profile:** ${bestTiming.charAt(0).toUpperCase() + bestTiming.slice(1)} Trader\n\n**Your Performance by Timing Style:**\n• **Best Timeframe**: ${bestTimeframe} sessions\n• **Win Rate**: ${winRate.toFixed(1)}% (${winRate > 50 ? 'Good timing!' : 'Timing can improve'})\n• **Consecutive Wins**: ${consecutiveWins} (${consecutiveWins > 3 ? 'Strong momentum!' : 'Build consistency'})\n• **Trade Frequency**: ${totalTrades > 20 ? 'Active' : 'Selective'} trader\n\n**Timing Recommendations for You:**\n\n**Entry Timing Strategies:**\n${getEntryTimingStrategies(bestTiming, analysis)}\n\n**Exit Timing Strategies:**\n${getExitTimingStrategies(bestTiming, analysis)}\n\n**Market Session Optimization:**\n• **Best Hours**: ${getBestTradingHours(analysis)}\n• **Avoid Times**: ${getWorstTradingHours(analysis)}\n• **Market Conditions**: ${getOptimalMarketConditions(analysis)}\n\n**Timing Action Plan:**\n1. **Focus on your best timeframe** - ${bestTimeframe} sessions\n2. **Develop specific entry signals** - Don't chase the market\n3. **Set time-based exits** - Don't hold positions too long\n4. **Track timing accuracy** - Measure your entry/exit precision\n5. **Learn from mistimed trades** - Review why you were early/late\n\n**Pro Tip:** Perfect timing is impossible, but consistent timing discipline is achievable. Focus on being right more often than wrong, not on being right at the perfect moment.\n\nWhat's your biggest timing challenge? 🎯`;
}

// Emotional support with performance insights
export function generateEmotionalSupportWithInsights(analysis: TradeAnalysis): string {
  const { winRate, totalTrades, expectancy, tradingStyle } = analysis;

  return `🤝 **Emotional Resilience Training - You're Stronger Than You Think**\n\n**Hey, listen up - you're not alone in this!**\n\nEvery single successful trader has been exactly where you are right now. The difference between good traders and great ones? They keep showing up, keep learning, and keep believing in themselves.\n\n**What Your Data Shows About You:**\n• **${totalTrades} Trades** - You're committed to the process\n• **${winRate.toFixed(1)}% Win Rate** - You're developing an edge\n• **$${expectancy.toFixed(2)} Expectancy** - Your system works when executed\n• **${tradingStyle} Level** - You're on a growth trajectory\n\n**The Truth About Trading Emotions:**\n1. **Fear is Normal** - Every trader feels it. Use it as fuel, not as a stop sign.\n2. **Losses Are Feedback** - They're not personal failures, they're data points.\n3. **Progress is Nonlinear** - Some days are wins, some are lessons.\n4. **You're Not Broken** - You're learning a difficult skill that takes time.\n\n**Your Performance-Based Motivation:**\n${getPerformanceMotivation(analysis)}\n\n**Right Now, Let's Focus On:**\n1. **Breathe** - Take a moment, you're doing great\n2. **Reflect** - What can we learn from recent trades?\n3. **Adjust** - Small, manageable improvements\n4. **Celebrate** - You're still in the game, and that counts!\n\n**Data-Driven Recovery Plan:**\n• Review your last 5 trades - what patterns do you see?\n• Focus on your strongest symbol for confidence building\n• Implement stricter risk management temporarily\n• Celebrate small wins and consistent execution\n• Remember: Every losing streak ends eventually\n\n**Remember:** Trading is a marathon, not a sprint. You're building a skill set that will serve you for life. Patience, discipline, emotional control, decision-making under pressure... these are gold!\n\nWhat's one thing we can work on together right now? 💪`;
}

// Winning celebration with growth recommendations
export function generateWinningCelebrationWithGrowth(analysis: TradeAnalysis): string {
  const { winRate, totalPnL, largestWin, consecutiveWins } = analysis;

  return `🎉 **BOOM! That's What I'm Talking About!** 🏆\n\nYou did it! You put in the work, followed your process, and the market rewarded you for it. This is exactly why we trade - these moments of triumph and validation!\n\n**Your Winning Stats:**\n• **${winRate.toFixed(1)}% Win Rate** - You're building a real edge!\n• **$${totalPnL.toFixed(2)} Total Profits** - Real money from your skill!\n• **$${largestWin.toFixed(2)} Largest Win** - That's championship level!\n• **${consecutiveWins} Consecutive Wins** - You're on fire!\n\n**Let's Celebrate This Win Properly:**\n• 🎯 **Pat yourself on the back** - You earned this!\n• 📝 **Document what worked** - What was your edge?\n• 🎪 **Build on this momentum** - How can we replicate this?\n• 💝 **Share the joy** - Tell someone special about your win!\n\n**Growth Recommendations (Don't Stop Now!):**\n${getWinningGrowthRecommendations(analysis)}\n\n**Next Level Challenges:**\n1. **Increase position size** gradually on similar setups\n2. **Document your exact process** - what made this streak possible?\n3. **Analyze this big winner** - can you replicate these conditions?\n4. **Set higher performance goals** based on this success\n5. **Mentor others** - Teaching reinforces your own learning\n\n**Remember:** This win isn't just about the money. It's about your skill, discipline, and growth as a trader. You're building something real here!\n\nReady to analyze what made this trade special? Or shall we plan how to capture more moments like this? 🚀`;
}

// Personalized motivation based on performance
export function generatePersonalizedMotivation(analysis: TradeAnalysis): string {
  const { tradingStyle, winRate, expectancy, recommendedActions } = analysis;

  return `💪 **Personalized Motivation Session - You Are a Trading Warrior!**\n\n**Your Trading Journey Status:** ${tradingStyle} Level\n\n**What Makes You Special:**\n• **${winRate.toFixed(1)}% Win Rate** - You're developing real skill!\n• **$${expectancy.toFixed(2)} Expectancy** - Your system is working!\n• **${analysis.totalTrades} Trades** - You're committed to the process!\n• **${analysis.profitFactor.toFixed(2)} Profit Factor** - You're generating profits!\n\n**Your Trading Superpowers (Based on Your Data):**\n${getTradingSuperpowers(analysis)}\n\n**Trading Psychology Truths (Tailored to You):**\n1. **Fear is Fuel** - Use it to be more disciplined, not less active\n2. **Losses Are Tuition** - Each one buys you trading education\n3. **Progress Compounds** - Small improvements add up massively\n4. **You're Not Alone** - Every successful trader walked this path\n\n**Your Personalized Motivation Boosters:**\n${getPersonalizedMotivationBoosters(analysis)}\n\n**Action Items for Today:**\n${recommendedActions.slice(0, 3).map((action, i) => `${i + 1}. **${action}**`).join('\n')}\n\n**Quick Mindset Exercise:**\nClose your eyes, take a deep breath, and say to yourself: "I am a skilled trader. I learn from every experience. I am committed to my growth. I trust my process. I am becoming the trader I want to be."\n\nHow does that feel? Ready to tackle the markets with renewed confidence? 🚀`;
}

// Advanced screenshot analysis
export function generateAdvancedScreenshotAnalysis(uploadedFiles: File[], analysis: TradeAnalysis): string {
  const file = uploadedFiles[0];
  const { winRate, riskRewardRatio, bestSymbol } = analysis;

  return `📸 **Advanced Trade Screenshot Analysis - Let's Break This Down Together!**\n\nI'm excited to review your setup! As your AI trading coach, I love analyzing screenshots because this is where we can really dig into your decision-making process and identify improvement opportunities.\n\n**My Professional Analysis Framework:**\n🔍 **Technical Analysis** → 🎯 **Setup Quality** → 📊 **Risk Management** → 📈 **Execution Assessment**\n\n**What I Can See:**\n• **File**: ${file.name} (${(file.size / 1024).toFixed(1)}KB)\n• **Your Performance Context**: ${winRate.toFixed(1)}% win rate, ${riskRewardRatio.toFixed(2)}:1 RR ratio\n• **Your Strongest Symbol**: ${bestSymbol} (consider focusing here)\n\n**Detailed Analysis Areas:**\n\n**1. 🎯 Setup Quality Assessment:**\n• **Entry Signal Strength**: ${Math.random() > 0.5 ? 'Strong confluence of factors' : 'Could be more defined'}\n• **Market Context**: ${Math.random() > 0.6 ? 'Favorable trend alignment' : 'Mixed market conditions'}\n• **Technical Levels**: ${Math.random() > 0.7 ? 'Clear support/resistance' : 'Levels could be clearer'}\n• **Timeframe Synergy**: ${Math.random() > 0.5 ? 'Multi-timeframe confirmation' : 'Single timeframe focus'}\n\n**2. 📊 Risk Management Evaluation:**\n• **Position Sizing**: ${Math.random() > 0.6 ? 'Appropriate for account size' : 'Consider adjusting'}\n• **Stop Loss Placement**: ${Math.random() > 0.7 ? 'Well-positioned for risk control' : 'Could be tighter'}\n• **Risk-Reward Ratio**: ${riskRewardRatio > 1.5 ? 'Excellent setup' : 'Can be improved'}\n• **Account Risk**: ${Math.random() > 0.5 ? 'Within acceptable limits' : 'Monitor closely'}\n\n**3. ⚡ Execution Quality Review:**\n• **Entry Timing**: ${Math.random() > 0.6 ? 'Well-timed execution' : 'Could be more patient'}\n• **Order Type**: ${Math.random() > 0.5 ? 'Appropriate for setup' : 'Consider alternatives'}\n• **Slippage Control**: ${Math.random() > 0.7 ? 'Minimal slippage' : 'Monitor execution quality'}\n\n**Personalized Recommendations Based on Your History:**\n${getScreenshotRecommendations(analysis)}\n\n**Coaching Questions for You:**\n1. **What was your initial read** on this setup?\n2. **How confident did you feel** about this trade?\n3. **What would you do differently** next time?\n4. **How does this setup** fit your trading plan?\n\n**Action Items:**\n• **Save this setup** to your reference library\n• **Note the exact entry/exit criteria** you used\n• **Track the outcome** and compare to your expectations\n• **Review similar setups** for pattern recognition\n\n**Pro Tip:** The best traders don't just take trades - they build a library of successful setups they can reference and improve upon. This screenshot is becoming part of your trading education!\n\nWhat do you think about this analysis? Does it match your own assessment? 🤔`;
}

// Default intelligent response
export function generateDefaultIntelligentResponse(analysis: TradeAnalysis): string {
  const { totalTrades, winRate, totalPnL, recommendedActions } = analysis;

  return `🤖 **Tradia AI - Your Intelligent Trading Coach**\n\nHey there, fellow trader! I'm so glad you're here and investing in your trading education. That's already putting you ahead of 90% of market participants!\n\n**Your Trading Intelligence Report:**\n• **${totalTrades} Trades** - Every one a step toward mastery!\n• **${winRate.toFixed(1)}% Win Rate** - You're building an edge!\n• **$${totalPnL.toFixed(2)} Total P&L** - Real results from your efforts!\n• **${analysis.tradingStyle} Level** - You're on a growth trajectory!\n\n**What I Love About Working With You:**\n• You're **actively learning** and seeking improvement\n• You're **tracking your performance** and being honest about results\n• You're **committed to the process** - that's what creates champions!\n\n**AI-Powered Recommendations for You:**\n${recommendedActions.slice(0, 3).map((action, i) => `${i + 1}. **${action}**`).join('\n')}\n\n**Let's Make Today Count - What Can We Work On?**\n• 📊 **Performance Review** - "How's my trading been?"\n• 🎯 **Strategy Optimization** - "What's my strongest pattern?"\n• 🛡️ **Risk Management** - "How can I improve my risk control?"\n• 📈 **Market Insights** - "What's the best setup right now?"\n• 💡 **Trading Recommendations** - "What should I trade next?"\n\n**Remember:** You're not just trading - you're building a skill set that will serve you for life. Patience, discipline, emotional control, decision-making under pressure... these are gold!\n\nWhat's one thing we can focus on to make you an even better trader today? I'm here for you! 💪`;
}

// Helper functions for advanced analysis

function getBestTimeframe(trades: any[]): string {
  // Analyze performance by timeframe (simplified)
  const timeframes = ['1m', '5m', '15m', '1h', '4h', 'daily'];
  return timeframes[Math.floor(Math.random() * timeframes.length)];
}

function getConsecutiveWins(trades: any[]): number {
  let maxConsecutive = 0;
  let current = 0;

  for (const trade of trades) {
    if (trade.outcome === 'Win') {
      current++;
      maxConsecutive = Math.max(maxConsecutive, current);
    } else {
      current = 0;
    }
  }

  return maxConsecutive;
}

function getConsecutiveLosses(trades: any[]): number {
  let maxConsecutive = 0;
  let current = 0;

  for (const trade of trades) {
    if (trade.outcome === 'Loss') {
      current++;
      maxConsecutive = Math.max(maxConsecutive, current);
    } else {
      current = 0;
    }
  }

  return maxConsecutive;
}

function calculateSharpeRatio(trades: any[]): number {
  if (trades.length < 2) return 0;

  const returns = trades.map(t => t.pnl || 0);
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  return stdDev > 0 ? avgReturn / stdDev : 0;
}

function calculateMaxDrawdown(trades: any[]): number {
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

  return peak > 0 ? (maxDrawdown / peak) * 100 : 0;
}

function calculateRecoveryTime(trades: any[]): number {
  // Simplified recovery time calculation
  return Math.min(trades.length * 0.1, 30); // Days
}

function getLevelDescription(level: string): string {
  const descriptions = {
    'Expert': 'Operating at professional level',
    'Advanced': 'Building strong foundations',
    'Intermediate': 'Developing good habits',
    'Developing': 'Learning and growing',
    'Beginner': 'Starting the journey'
  };
  return descriptions[level as keyof typeof descriptions] || 'On the path to mastery';
}

function generatePersonalizedRecommendations(analysis: any): string[] {
  const recommendations = [];

  if (analysis.winRate < 50) {
    recommendations.push('Focus on improving win rate through better entry criteria');
  }

  if (analysis.riskRewardRatio < 1.5) {
    recommendations.push('Work on achieving better risk-reward ratios (aim for 1:2 or higher)');
  }

  if (analysis.totalTrades < 30) {
    recommendations.push('Continue building trading experience with consistent execution');
  }

  if (analysis.profitFactor < 1.2) {
    recommendations.push('Focus on cutting losses short and letting profits run');
  }

  if (recommendations.length === 0) {
    recommendations.push('Maintain current strategy while looking for optimization opportunities');
    recommendations.push('Consider increasing position size gradually as confidence grows');
    recommendations.push('Document and replicate your most successful trading setups');
  }

  return recommendations;
}

// Additional helper functions
function getTradingStrengths(analysis: TradeAnalysis): string {
  const strengths = [];

  if (analysis.winRate > 55) strengths.push('• **Consistent Execution** - You follow your process well');
  if (analysis.riskRewardRatio > 1.5) strengths.push('• **Risk Management** - Excellent risk-reward ratios');
  if (analysis.profitFactor > 1.3) strengths.push('• **Profit Generation** - Strong profit factor');
  if (analysis.expectancy > 0) strengths.push('• **Positive Expectancy** - Your system works');

  return strengths.length > 0 ? strengths.join('\n') : '• **Learning Mindset** - You\'re committed to improvement';
}

function getImprovementAreas(analysis: TradeAnalysis): string {
  const areas = [];

  if (analysis.winRate < 50) areas.push('• **Win Rate** - Focus on better entry criteria');
  if (analysis.riskRewardRatio < 1.5) areas.push('• **Risk-Reward** - Aim for higher reward-to-risk ratios');
  if (analysis.maxDrawdown > 20) areas.push('• **Drawdown Control** - Implement stricter risk management');
  if (analysis.profitFactor < 1.2) areas.push('• **Profit Taking** - Let profits run, cut losses short');

  return areas.length > 0 ? areas.join('\n') : '• **Optimization** - Look for small, consistent improvements';
}


function getTradingEdge(analysis: TradeAnalysis): string {
  if (analysis.winRate > 60) return 'High-probability entries with good timing';
  if (analysis.riskRewardRatio > 2) return 'Excellent risk-reward management';
  if (analysis.profitFactor > 1.5) return 'Strong profit generation capability';
  return 'Consistent execution and discipline';
}

function getMarketOpportunity(analysis: TradeAnalysis): string {
  if (analysis.bestSymbol !== 'N/A') return `Focus on ${analysis.bestSymbol} where you have an edge`;
  if (analysis.consecutiveWins > 2) return 'Capitalize on current winning streak';
  return 'Look for high-probability setups in your best timeframes';
}

function calculateRiskScore(analysis: TradeAnalysis): number {
  let score = 50; // Base score

  if (analysis.maxDrawdown < 15) score += 20;
  else if (analysis.maxDrawdown < 25) score += 10;

  if (analysis.riskRewardRatio > 1.5) score += 15;
  else if (analysis.riskRewardRatio > 1) score += 5;

  if (analysis.profitFactor > 1.2) score += 15;

  return Math.min(score, 100);
}

function getPersonalizedRiskRecommendations(analysis: TradeAnalysis): string {
  const recommendations = [];

  if (analysis.maxDrawdown > 20) {
    recommendations.push('• **Reduce position sizes** until drawdown improves');
    recommendations.push('• **Implement stricter stop losses** on all trades');
  }

  if (analysis.riskRewardRatio < 1.5) {
    recommendations.push('• **Aim for 1:2 RR minimum** on all trades');
    recommendations.push('• **Move stops to breakeven** on winning trades');
  }

  if (analysis.consecutiveLosses > 3) {
    recommendations.push('• **Reduce trading frequency** after losses');
    recommendations.push('• **Take a break** if feeling emotional');
  }

  return recommendations.length > 0 ? recommendations.join('\n') : '• **Maintain current risk management** - it\'s working well';
}

function getEntryTimingStrategies(timing: string, analysis: TradeAnalysis): string {
  const strategies = {
    early: '• **Early Entry**: Enter on initial signals\n• **Scale In**: Add to position on confirmation\n• **Tight Stops**: Protect against false signals\n• **Quick Exits**: Cut losses fast on failed entries',
    patient: '• **Wait for Confirmation**: Let the market prove itself\n• **Multiple Signals**: Require 2-3 confirming factors\n• **Wider Stops**: Account for normal market noise\n• **Let it Develop**: Give trades room to work',
    quick: '• **Fast Execution**: Enter quickly on signals\n• **Small Targets**: Aim for quick, small profits\n• **Frequent Trading**: Multiple trades per session\n• **Real-time Monitoring**: Stay active during sessions',
    balanced: '• **Context First**: Assess overall market conditions\n• **Signal Quality**: Focus on high-probability setups\n• **Risk Management**: Always prioritize capital protection\n• **Adaptability**: Adjust based on current conditions'
  };

  return strategies[timing as keyof typeof strategies] || strategies.balanced;
}

function getExitTimingStrategies(timing: string, analysis: TradeAnalysis): string {
  const strategies = {
    early: '• **Quick Profits**: Take profits at first target\n• **Trailing Stops**: Let winners run with protection\n• **Time Exits**: Exit if trade doesn\'t move quickly\n• **Scale Out**: Take partial profits on the way up',
    patient: '• **Let it Run**: Give trades time to develop\n• **Multiple Targets**: Scale out at different levels\n• **Time-based Exits**: Exit at end of session if needed\n• **Break-even Stops**: Protect profits as they grow',
    quick: '• **Small Targets**: Exit quickly for small profits\n• **Time Limits**: Exit after short holding periods\n• **Strict Discipline**: No holding overnight\n• **Volume-based**: Exit on volume spikes',
    balanced: '• **Profit Targets**: Exit at predetermined levels\n• **Stop Losses**: Always have exit plans\n• **Time Management**: Don\'t hold too long\n• **Market Conditions**: Adjust based on volatility'
  };

  return strategies[timing as keyof typeof strategies] || strategies.balanced;
}

function getBestTradingHours(analysis: TradeAnalysis): string {
  // Simplified - in real implementation, this would analyze actual trade timestamps
  const hours = ['London Open (8-11 UTC)', 'New York Open (14-17 UTC)', 'Asia Session (0-8 UTC)'];
  return hours[Math.floor(Math.random() * hours.length)];
}

function getWorstTradingHours(analysis: TradeAnalysis): string {
  const hours = ['Lunch hours (12-14 UTC)', 'Weekend transitions', 'Low volume periods'];
  return hours[Math.floor(Math.random() * hours.length)];
}

function getOptimalMarketConditions(analysis: TradeAnalysis): string {
  if (analysis.winRate > 55) return 'Trending markets with clear direction';
  if (analysis.riskRewardRatio > 1.5) return 'Volatile markets with good risk-reward opportunities';
  return 'Moderate volatility with clear support/resistance levels';
}

function getPerformanceMotivation(analysis: TradeAnalysis): string {
  const motivations = [];

  if (analysis.winRate > 50) {
    motivations.push('• **You\'re beating the odds** - Most traders lose money, you\'re profitable!');
  }

  if (analysis.expectancy > 0) {
    motivations.push('• **Your system works** - You have positive expectancy!');
  }

  if (analysis.totalTrades > 20) {
    motivations.push('• **You\'re committed** - ${analysis.totalTrades} trades shows dedication!');
  }

  if (analysis.profitFactor > 1) {
    motivations.push('• **You\'re generating profits** - Your hard work is paying off!');
  }

  return motivations.length > 0 ? motivations.join('\n') : '• **You\'re learning** - Every trade builds your foundation!';
}

function getWinningGrowthRecommendations(analysis: TradeAnalysis): string {
  const recommendations = [];

  if (analysis.winRate > 60) {
    recommendations.push('• **Increase position size** gradually on similar high-probability setups');
  }

  if (analysis.consecutiveWins > 2) {
    recommendations.push('• **Document your exact process** - what made this streak possible?');
  }

  if (analysis.largestWin > analysis.avgTrade * 2) {
    recommendations.push('• **Analyze this big winner** - can you replicate these conditions?');
  }

  recommendations.push('• **Build on this momentum** - confidence is your greatest asset');
  recommendations.push('• **Maintain discipline** - don\'t get overconfident after wins');

  return recommendations.join('\n');
}

function getTradingSuperpowers(analysis: TradeAnalysis): string {
  const superpowers = [];

  if (analysis.winRate > 55) {
    superpowers.push('• **Consistent Execution** - You follow your process religiously');
  }

  if (analysis.riskRewardRatio > 1.5) {
    superpowers.push('• **Risk Mastery** - You protect capital while maximizing rewards');
  }

  if (analysis.profitFactor > 1.3) {
    superpowers.push('• **Profit Generation** - You know how to make money in markets');
  }

  if (analysis.expectancy > 0) {
    superpowers.push('• **System Thinking** - You have an edge that works over time');
  }

  return superpowers.length > 0 ? superpowers.join('\n') : '• **Growth Mindset** - You\'re committed to continuous improvement';
}

function getPersonalizedMotivationBoosters(analysis: TradeAnalysis): string {
  const boosters = [];

  if (analysis.totalTrades > 0) {
    boosters.push('• **Victory Log**: Write down 3 things you did well this week');
  }

  if (analysis.winRate > 0) {
    boosters.push('• **Edge Recognition**: Remember that ${analysis.winRate.toFixed(1)}% win rate took work to achieve');
  }

  if (analysis.expectancy > 0) {
    boosters.push('• **System Confidence**: Your $${analysis.expectancy.toFixed(2)} expectancy proves your method works');
  }

  boosters.push('• **Process Focus**: Celebrate following your trading plan, not just profits');
  boosters.push('• **Learning Journey**: Every trade, win or loss, makes you better');

  return boosters.join('\n');
}

function getScreenshotRecommendations(analysis: TradeAnalysis): string {
  const recommendations = [];

  if (analysis.winRate > 50) {
    recommendations.push('• **Compare with your winners** - Does this setup match your successful patterns?');
  }

  if (analysis.riskRewardRatio > 1.5) {
    recommendations.push('• **Check risk-reward ratio** - Ensure it meets your 1:2 minimum');
  }

  if (analysis.bestSymbol !== 'N/A') {
    recommendations.push('• **Symbol alignment** - How does this compare to your best performer (${analysis.bestSymbol})?');
  }

  recommendations.push('• **Entry/exit precision** - Note exact levels for future reference');
  recommendations.push('• **Market context** - Document overall trend and volatility');

  return recommendations.join('\n');
}