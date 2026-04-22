export type MarketSession = "ASIA" | "LONDON" | "NEW_YORK" | "OVERLAP";
export type DirectionalBias = "bullish" | "bearish" | "neutral";

export type EditablePreTradeBriefStatus = "draft" | "ready" | "invalidated" | "executed" | "skipped";
export type PreTradeBriefStatus = "generated" | "failed" | EditablePreTradeBriefStatus;
export type PreTradeApprovalState = "ready" | "blocked" | "manual_override";

export interface PreTradeBriefInput {
  pairSymbol: string;
  timeframe: string;
  marketSession: MarketSession;
  directionalBiasInput: DirectionalBias;
  setupNotes?: string;
  plannedEntry?: number | null;
  plannedStopLoss?: number | null;
  plannedTakeProfit?: number | null;
}

export interface GeneratedPreTradeBrief {
  summary: string;
  bias: string;
  confluence: string[];
  risks: string[];
  invalidationSignals: string[];
  checklist: string[];
  aiModel: string;
  promptVersion: string;
  generationLatencyMs: number;
}

export interface ChecklistItemState {
  completed: boolean;
  completedAt?: string;
}

export type ChecklistStateMap = Record<string, ChecklistItemState>;

export interface PreTradeBriefRecord {
  id: string;
  user_id: string;
  forex_pair_id: string;
  pair_symbol_snapshot: string;
  timeframe: string;
  market_session: MarketSession;
  directional_bias_input: DirectionalBias;
  setup_notes: string | null;
  planned_entry: number | null;
  planned_stop_loss: number | null;
  planned_take_profit: number | null;
  risk_reward_ratio: number | null;
  ai_summary: string | null;
  ai_bias: string | null;
  ai_confluence: string[];
  ai_risks: string[];
  ai_invalidators: string[];
  ai_checklist: string[];
  ai_model?: string | null;
  prompt_version?: string | null;
  generation_latency_ms?: number | null;
  raw_ai_response: unknown;
  event_risk_action?: "proceed" | "size_down" | "wait" | null;
  event_risk_summary?: string | null;
  event_risk_window_start?: string | null;
  event_risk_window_end?: string | null;
  approval_state?: PreTradeApprovalState | null;
  trader_notes?: string | null;
  checklist_state?: ChecklistStateMap | null;
  last_reviewed_at?: string | null;
  status: PreTradeBriefStatus;
  created_at: string;
  updated_at: string;
  forex_pairs?: {
    symbol: string;
  } | null;
}

export interface PreTradeBriefListItem {
  id: string;
  pair_symbol_snapshot: string;
  timeframe: string;
  market_session: MarketSession;
  directional_bias_input: DirectionalBias;
  status: PreTradeBriefStatus;
  created_at: string;
}

export interface UpdatePreTradeBriefPayload {
  status?: EditablePreTradeBriefStatus;
  trader_notes?: string | null;
  checklist_state?: ChecklistStateMap | null;
  last_reviewed_at?: string | null;
  approval_state?: PreTradeApprovalState;
}
