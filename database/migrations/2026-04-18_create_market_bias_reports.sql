-- Create market bias reports table for phase-3 dashboard workflow integration
CREATE TABLE IF NOT EXISTS market_bias_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  forex_pair_id UUID NOT NULL REFERENCES forex_pairs(id) ON DELETE RESTRICT,
  pair_symbol_snapshot TEXT NOT NULL,
  timeframe_set TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  bias_direction TEXT NOT NULL,
  confidence_score NUMERIC NOT NULL,
  key_levels JSONB NOT NULL DEFAULT '{}'::JSONB,
  assumptions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  invalidation_conditions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  alternate_scenario TEXT,
  confidence_rationale TEXT,
  source TEXT NOT NULL DEFAULT 'ai',
  raw_ai_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT market_bias_reports_bias_direction_check CHECK (bias_direction IN ('bullish', 'bearish', 'neutral')),
  CONSTRAINT market_bias_reports_source_check CHECK (source IN ('manual', 'ai', 'hybrid')),
  CONSTRAINT market_bias_reports_confidence_score_check CHECK (confidence_score >= 0 AND confidence_score <= 100)
);

CREATE INDEX IF NOT EXISTS idx_market_bias_reports_user_created ON market_bias_reports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_bias_reports_pair ON market_bias_reports(forex_pair_id);

CREATE OR REPLACE FUNCTION trg_market_bias_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_market_bias_reports_updated_at ON market_bias_reports;
CREATE TRIGGER trigger_market_bias_reports_updated_at
  BEFORE UPDATE ON market_bias_reports
  FOR EACH ROW
  EXECUTE FUNCTION trg_market_bias_reports_updated_at();

ALTER TABLE market_bias_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS market_bias_reports_select_own ON market_bias_reports;
CREATE POLICY market_bias_reports_select_own
ON market_bias_reports
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS market_bias_reports_insert_own ON market_bias_reports;
CREATE POLICY market_bias_reports_insert_own
ON market_bias_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS market_bias_reports_update_own ON market_bias_reports;
CREATE POLICY market_bias_reports_update_own
ON market_bias_reports
FOR UPDATE
TO authenticated
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS market_bias_reports_delete_own ON market_bias_reports;
CREATE POLICY market_bias_reports_delete_own
ON market_bias_reports
FOR DELETE
TO authenticated
USING (auth.uid()::text = user_id::text);
