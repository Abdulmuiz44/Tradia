"use client";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Calculator,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Info,
  DollarSign,
  Percent,
  Zap,
  Shield,
  BarChart3,
  PieChart,
  Settings,
  Save,
  RotateCcw,
  Copy,
  Share2
} from "lucide-react";
import { calculatePositionSize, validatePositionSizingParams } from "@/utils/positionSizing";

interface PositionSizeResult {
  positionSize: number;
  riskAmount: number;
  potentialLoss: number;
  potentialProfit: number;
  riskRewardRatio: number;
  confidence: 'low' | 'medium' | 'high';
  recommendation: string;
}

export default function PositionSizing() {
  // Basic Calculator State
  const [accountSize, setAccountSize] = useState(10000);
  const [riskPercent, setRiskPercent] = useState(1);
  const [stopLossPips, setStopLossPips] = useState(50);
  const [takeProfitPips, setTakeProfitPips] = useState(100);
  const [pipValue, setPipValue] = useState(10); // $ per pip for standard lot
  const [leverage, setLeverage] = useState(100);

  // Advanced Calculator State
  const [entryPrice, setEntryPrice] = useState(1.0500);
  const [stopLossPrice, setStopLossPrice] = useState(1.0450);
  const [takeProfitPrice, setTakeProfitPrice] = useState(1.0600);
  const [positionType, setPositionType] = useState<'buy' | 'sell'>('buy');

  // Risk Management State
  const [maxDailyLoss, setMaxDailyLoss] = useState(100);
  const [maxLossPerTrade, setMaxLossPerTrade] = useState(50);
  const [winRate, setWinRate] = useState(60);

  // UI State
  const [activeTab, setActiveTab] = useState('basic');
  const [savedCalculations, setSavedCalculations] = useState<PositionSizeResult[]>([]);

  // Basic Calculator Results
  const basicResults = useMemo((): PositionSizeResult => {
    try {
      // Validate parameters first
      const validationErrors = validatePositionSizingParams({
        accountBalance: accountSize,
        riskPercentage: riskPercent,
        stopLoss: stopLossPips,
        entryPrice: 1, // Dummy value for basic calculator
        pipValue: pipValue,
        takeProfit: takeProfitPips
      });

      if (validationErrors.length > 0) {
        return {
          positionSize: 0,
          riskAmount: 0,
          potentialLoss: 0,
          potentialProfit: 0,
          riskRewardRatio: 0,
          confidence: 'low',
          recommendation: `Validation errors: ${validationErrors.join(', ')}`
        };
      }

      // Use the utility function for calculation
      const result = calculatePositionSize({
        accountBalance: accountSize,
        riskPercentage: riskPercent,
        stopLoss: stopLossPips,
        entryPrice: 1, // Dummy value for basic calculator
        pipValue: pipValue,
        takeProfit: takeProfitPips
      });

      return result;
    } catch (error) {
      return {
        positionSize: 0,
        riskAmount: 0,
        potentialLoss: 0,
        potentialProfit: 0,
        riskRewardRatio: 0,
        confidence: 'low',
        recommendation: `Calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }, [accountSize, riskPercent, stopLossPips, takeProfitPips, pipValue]);

  // Advanced Calculator Results
  const advancedResults = useMemo((): PositionSizeResult => {
    const pipDifference = Math.abs(entryPrice - stopLossPrice);
    const riskAmount = (accountSize * riskPercent) / 100;
    const positionSize = pipDifference > 0 ? riskAmount / (pipDifference * pipValue * 100000) : 0; // Convert to lots

    const tpDifference = Math.abs(entryPrice - takeProfitPrice);
    const potentialProfit = positionSize * (tpDifference * pipValue * 100000);
    const potentialLoss = riskAmount;
    const riskRewardRatio = potentialLoss > 0 ? potentialProfit / potentialLoss : 0;

    let confidence: 'low' | 'medium' | 'high' = 'medium';
    let recommendation = 'Advanced calculation completed.';

    if (riskRewardRatio >= 2) {
      confidence = 'high';
      recommendation = 'Strong setup with good risk-reward ratio.';
    } else if (riskRewardRatio >= 1) {
      confidence = 'medium';
      recommendation = 'Acceptable risk-reward ratio.';
    } else {
      confidence = 'low';
      recommendation = 'Review your risk management. Consider better entry/exit levels.';
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
  }, [accountSize, riskPercent, entryPrice, stopLossPrice, takeProfitPrice, pipValue]);

  const saveCalculation = () => {
    const currentResults = activeTab === 'basic' ? basicResults : advancedResults;
    setSavedCalculations(prev => [currentResults, ...prev.slice(0, 4)]); // Keep last 5
  };

  const resetCalculator = () => {
    setAccountSize(10000);
    setRiskPercent(1);
    setStopLossPips(50);
    setTakeProfitPips(100);
    setPipValue(10);
    setLeverage(100);
    setEntryPrice(1.0500);
    setStopLossPrice(1.0450);
    setTakeProfitPrice(1.0600);
    setPositionType('buy');
  };

  const copyResults = () => {
    const results = activeTab === 'basic' ? basicResults : advancedResults;
    const text = `Position Size: ${results.positionSize.toFixed(2)} lots
Risk Amount: $${results.riskAmount.toFixed(2)}
Risk/Reward: 1:${results.riskRewardRatio.toFixed(2)}
${results.recommendation}`;

    navigator.clipboard.writeText(text);
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case 'high': return <CheckCircle className="w-4 h-4" />;
      case 'medium': return <Info className="w-4 h-4" />;
      case 'low': return <AlertTriangle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-6 h-6 text-blue-500" />
            Advanced Position Sizing Calculator
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Professional position sizing with risk management and multiple calculation methods
          </p>
        </CardHeader>
      </Card>

      {/* Main Calculator */}
      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Calculator</TabsTrigger>
              <TabsTrigger value="advanced">Advanced Calculator</TabsTrigger>
              <TabsTrigger value="risk">Risk Management</TabsTrigger>
            </TabsList>

            {/* Basic Calculator Tab */}
            <TabsContent value="basic" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="accountSize">Account Size ($)</Label>
                    <Input
                      id="accountSize"
                      type="number"
                      value={accountSize}
                      onChange={(e) => setAccountSize(parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="riskPercent">Risk Per Trade (%)</Label>
                    <Input
                      id="riskPercent"
                      type="number"
                      step="0.1"
                      value={riskPercent}
                      onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="stopLossPips">Stop Loss (Pips)</Label>
                    <Input
                      id="stopLossPips"
                      type="number"
                      value={stopLossPips}
                      onChange={(e) => setStopLossPips(parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="takeProfitPips">Take Profit (Pips)</Label>
                    <Input
                      id="takeProfitPips"
                      type="number"
                      value={takeProfitPips}
                      onChange={(e) => setTakeProfitPips(parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="pipValue">Pip Value ($)</Label>
                    <Input
                      id="pipValue"
                      type="number"
                      step="0.01"
                      value={pipValue}
                      onChange={(e) => setPipValue(parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Results */}
                <div className="space-y-4">
                  <div className="p-4 bg-gray-800 rounded-lg">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Calculation Results
                    </h3>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Position Size:</span>
                        <span className="font-bold">{basicResults.positionSize.toFixed(2)} lots</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Risk Amount:</span>
                        <span>${basicResults.riskAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Risk/Reward:</span>
                        <span>1:{basicResults.riskRewardRatio.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Potential Profit:</span>
                        <span className="text-green-600">${basicResults.potentialProfit.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Potential Loss:</span>
                        <span className="text-red-600">${basicResults.potentialLoss.toFixed(2)}</span>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getConfidenceColor(basicResults.confidence)}`} />
                      <span className="text-sm font-medium capitalize">{basicResults.confidence} Confidence</span>
                      {getConfidenceIcon(basicResults.confidence)}
                    </div>

                    <p className="text-sm text-muted-foreground mt-2">
                      {basicResults.recommendation}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button onClick={saveCalculation} variant="outline" size="sm" data-track="calculator_save" data-track-meta='{"tool":"position_sizing","mode":"basic"}'>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button onClick={copyResults} variant="outline" size="sm" data-track="calculator_copy" data-track-meta='{"tool":"position_sizing","mode":"basic"}'>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                    <Button onClick={resetCalculator} variant="outline" size="sm" data-track="calculator_reset" data-track-meta='{"tool":"position_sizing","mode":"basic"}'>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Advanced Calculator Tab */}
            <TabsContent value="advanced" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="entryPrice">Entry Price</Label>
                    <Input
                      id="entryPrice"
                      type="number"
                      step="0.0001"
                      value={entryPrice}
                      onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="stopLossPrice">Stop Loss Price</Label>
                    <Input
                      id="stopLossPrice"
                      type="number"
                      step="0.0001"
                      value={stopLossPrice}
                      onChange={(e) => setStopLossPrice(parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="takeProfitPrice">Take Profit Price</Label>
                    <Input
                      id="takeProfitPrice"
                      type="number"
                      step="0.0001"
                      value={takeProfitPrice}
                      onChange={(e) => setTakeProfitPrice(parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="positionType">Position Type</Label>
                    <select
                      id="positionType"
                      value={positionType}
                      onChange={(e) => setPositionType(e.target.value as 'buy' | 'sell')}
                      className="w-full mt-1 p-2 rounded border bg-gray-800"
                    >
                      <option value="buy">Buy</option>
                      <option value="sell">Sell</option>
                    </select>
                  </div>
                </div>

                {/* Advanced Results */}
                <div className="space-y-4">
                  <div className="p-4 bg-gray-800 rounded-lg">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Advanced Results
                    </h3>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Position Size:</span>
                        <span className="font-bold">{advancedResults.positionSize.toFixed(4)} lots</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Risk Amount:</span>
                        <span>${advancedResults.riskAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Risk/Reward:</span>
                        <span>1:{advancedResults.riskRewardRatio.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Potential Profit:</span>
                        <span className="text-green-600">${advancedResults.potentialProfit.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Potential Loss:</span>
                        <span className="text-red-600">${advancedResults.potentialLoss.toFixed(2)}</span>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getConfidenceColor(advancedResults.confidence)}`} />
                      <span className="text-sm font-medium capitalize">{advancedResults.confidence} Confidence</span>
                      {getConfidenceIcon(advancedResults.confidence)}
                    </div>

                    <p className="text-sm text-muted-foreground mt-2">
                      {advancedResults.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Risk Management Tab */}
            <TabsContent value="risk" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="maxDailyLoss">Max Daily Loss ($)</Label>
                    <Input
                      id="maxDailyLoss"
                      type="number"
                      value={maxDailyLoss}
                      onChange={(e) => setMaxDailyLoss(parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="maxLossPerTrade">Max Loss Per Trade ($)</Label>
                    <Input
                      id="maxLossPerTrade"
                      type="number"
                      value={maxLossPerTrade}
                      onChange={(e) => setMaxLossPerTrade(parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="winRate">Expected Win Rate (%)</Label>
                    <Input
                      id="winRate"
                      type="number"
                      min="0"
                      max="100"
                      value={winRate}
                      onChange={(e) => setWinRate(parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Risk Assessment
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Daily Loss Limit Usage</span>
                          <span>{((basicResults.riskAmount / maxDailyLoss) * 100).toFixed(1)}%</span>
                        </div>
                        <Progress value={(basicResults.riskAmount / maxDailyLoss) * 100} className="h-2" />
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Per Trade Loss Limit Usage</span>
                          <span>{((basicResults.riskAmount / maxLossPerTrade) * 100).toFixed(1)}%</span>
                        </div>
                        <Progress value={(basicResults.riskAmount / maxLossPerTrade) * 100} className="h-2" />
                      </div>

                      <div className="pt-2">
                        <Badge variant={basicResults.riskAmount <= maxLossPerTrade ? "default" : "destructive"}>
                          {basicResults.riskAmount <= maxLossPerTrade ? "Within Risk Limits" : "Exceeds Risk Limits"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Saved Calculations */}
      {savedCalculations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Recent Calculations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedCalculations.map((calc, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div>
                    <span className="font-medium">{calc.positionSize.toFixed(2)} lots</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      Risk: ${calc.riskAmount.toFixed(2)} | R:R 1:{calc.riskRewardRatio.toFixed(2)}
                    </span>
                  </div>
                  <Badge variant={calc.confidence === 'high' ? 'default' : calc.confidence === 'medium' ? 'secondary' : 'destructive'}>
                    {calc.confidence}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Educational Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" />
            Position Sizing Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Risk Management</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Never risk more than 1-2% per trade</li>
                <li>• Maintain 2:1 reward-to-risk ratio minimum</li>
                <li>• Consider market volatility in position sizing</li>
                <li>• Use proper stop-loss levels</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Position Sizing Tips</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Account size determines maximum position size</li>
                <li>• Pip value varies by currency pair and lot size</li>
                <li>• Consider leverage impact on margin requirements</li>
                <li>• Adjust for account currency differences</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
