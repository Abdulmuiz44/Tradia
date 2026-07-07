import { checkRiskInternal } from '../src/risk.js'

const result = checkRiskInternal({
  accountBalance: 500,
  riskPercent: 1,
  entry: 100,
  stopLoss: 98,
  takeProfit: 106,
  dailyLossLimitPercent: 3,
  maxRiskPerTradePercent: 1,
})

console.log(JSON.stringify({ result }, null, 2))

// ⚠️ Not financial advice. Human review required.
