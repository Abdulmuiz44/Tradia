export type BiasDirection = "bullish" | "bearish" | "neutral";
export type BiasSource = "manual" | "ai" | "hybrid";

export interface MarketBiasInput {
  pairSymbol: string;
  timeframeSet: string[];
  sessionContext?: string;
  recentBackdrop?: string;
}

export interface GeneratedMarketBias {
  biasDirection: BiasDirection;
  confidenceScore: number;
  keyLevels: {
    support: number[];
    resistance: number[];
    invalidationLevel: number | null;
  };
  assumptions: string[];
  invalidationConditions: string[];
  alternateScenario: string;
  confidenceRationale: string;
  aiModel: string;
  promptVersion: string;
  generationLatencyMs: number;
}

export interface MarketBiasRecord {
  id: string;
  user_id: string;
  forex_pair_id: string;
  pair_symbol_snapshot: string;
  timeframe_set: string[];
  bias_direction: BiasDirection;
  confidence_score: number;
  key_levels: {
    support: number[];
    resistance: number[];
    invalidationLevel: number | null;
  };
  assumptions: string[];
  invalidation_conditions: string[];
  alternate_scenario: string | null;
  confidence_rationale: string | null;
  ai_model?: string | null;
  prompt_version?: string | null;
  generation_latency_ms?: number | null;
  source: BiasSource;
  created_at: string;
  updated_at: string;
}
