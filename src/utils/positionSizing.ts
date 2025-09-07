// src/utils/positionSizing.ts

export interface PositionSizeCalculation {
  positionSize: number;
  riskAmount: number;
  potentialLoss: number;
  potentialProfit: number;
  riskRewardRatio: number;
  confidence: 'low' | 'medium' | 'high';
  recommendation: string;
}

export interface PositionSizingParams {
  accountBalance: number;
  riskPercentage: number;
  stopLoss: number;
  entryPrice: number;
  pipValue?: number;
  leverage?: number;
  takeProfit?: number;
}

/**
 * Calculate position size based on risk management principles
 */
export function calculatePositionSize(params: PositionSizingParams): PositionSizeCalculation {
  const {
    accountBalance,
    riskPercentage,
    stopLoss,
    entryPrice,
    pipValue = 10,
    leverage = 100,
    takeProfit
  } = params;

  // Validate inputs
  if (!accountBalance || !riskPercentage || !stopLoss || !entryPrice) {
    throw new Error('Missing required parameters for position sizing calculation');
  }

  // Calculate risk amount
  const riskAmount = (accountBalance * riskPercentage) / 100;

  // Calculate stop loss in pips (assuming forex)
  const stopLossPips = Math.abs(entryPrice - stopLoss);

  // Calculate position size
  const positionSize = stopLossPips !== 0 ? riskAmount / (stopLossPips * pipValue) : 0;

  // Calculate potential profit if take profit is provided
  let potentialProfit = 0;
  if (takeProfit) {
    const takeProfitPips = Math.abs(entryPrice - takeProfit);
    potentialProfit = positionSize * (takeProfitPips * pipValue);
  }

  const potentialLoss = riskAmount;
  const riskRewardRatio = potentialProfit > 0 ? potentialProfit / potentialLoss : 0;

  // Determine confidence level
  let confidence: 'low' | 'medium' | 'high' = 'medium';
  let recommendation = 'Position size calculated based on risk management principles.';

  if (riskRewardRatio >= 3) {
    confidence = 'high';
    recommendation = 'Excellent risk-reward ratio! Consider increasing position size slightly.';
  } else if (riskRewardRatio >= 1.5) {
    confidence = 'medium';
    recommendation = 'Good risk-reward ratio. Position size looks reasonable.';
  } else {
    confidence = 'low';
    recommendation = 'Poor risk-reward ratio. Consider adjusting take profit or reducing position size.';
  }

  // Additional checks
  if (positionSize > accountBalance * 0.1) {
    recommendation += ' Warning: Position size exceeds 10% of account.';
    confidence = 'low';
  }

  if (riskPercentage > 2) {
    recommendation += ' High risk percentage detected. Consider reducing risk per trade.';
    confidence = 'low';
  }

  return {
    positionSize,
    riskAmount,
    potentialLoss,
    potentialProfit,
    riskRewardRatio,
    confidence,
    recommendation
  };
}

/**
 * Calculate optimal position size for multiple scenarios
 */
export function calculateOptimalPositionSize(
  accountBalance: number,
  riskPercentage: number,
  scenarios: Array<{
    stopLoss: number;
    entryPrice: number;
    takeProfit?: number;
    pipValue?: number;
  }>
): PositionSizeCalculation[] {
  return scenarios.map(scenario =>
    calculatePositionSize({
      accountBalance,
      riskPercentage,
      ...scenario
    })
  );
}

/**
 * Calculate position size with leverage consideration
 */
export function calculatePositionSizeWithLeverage(
  params: PositionSizingParams & { leverage: number }
): PositionSizeCalculation & { marginRequired: number; leverageUsed: number } {
  const calculation = calculatePositionSize(params);

  const marginRequired = (calculation.positionSize * params.entryPrice) / params.leverage;
  const leverageUsed = (calculation.positionSize * params.entryPrice) / marginRequired;

  return {
    ...calculation,
    marginRequired,
    leverageUsed
  };
}

/**
 * Validate position sizing parameters
 */
export function validatePositionSizingParams(params: Partial<PositionSizingParams>): string[] {
  const errors: string[] = [];

  if (!params.accountBalance || params.accountBalance <= 0) {
    errors.push('Account balance must be greater than 0');
  }

  if (!params.riskPercentage || params.riskPercentage <= 0 || params.riskPercentage > 100) {
    errors.push('Risk percentage must be between 0 and 100');
  }

  if (!params.entryPrice || params.entryPrice <= 0) {
    errors.push('Entry price must be greater than 0');
  }

  if (!params.stopLoss || params.stopLoss <= 0) {
    errors.push('Stop loss must be greater than 0');
  }

  if (params.takeProfit && params.takeProfit <= 0) {
    errors.push('Take profit must be greater than 0');
  }

  if (params.leverage && (params.leverage <= 0 || params.leverage > 1000)) {
    errors.push('Leverage must be between 0 and 1000');
  }

  return errors;
}