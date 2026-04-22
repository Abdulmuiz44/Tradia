-- Event awareness + AI audit metadata support

CREATE TABLE IF NOT EXISTS economic_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_event_id TEXT UNIQUE,
  title TEXT NOT NULL,
  country TEXT,
  currency TEXT NOT NULL,
  impact TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  actual TEXT,
  forecast TEXT,
  previous TEXT,
  event_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT economic_events_impact_check CHECK (impact IN ('low', 'medium', 'high'))
);

CREATE INDEX IF NOT EXISTS idx_economic_events_currency_time ON economic_events(currency, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_economic_events_impact_time ON economic_events(impact, scheduled_at);

CREATE OR REPLACE FUNCTION trg_economic_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_economic_events_updated_at ON economic_events;
CREATE TRIGGER trigger_economic_events_updated_at
  BEFORE UPDATE ON economic_events
  FOR EACH ROW
  EXECUTE FUNCTION trg_economic_events_updated_at();

ALTER TABLE economic_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS economic_events_read_all ON economic_events;
CREATE POLICY economic_events_read_all
ON economic_events
FOR SELECT
TO authenticated, anon
USING (true);

ALTER TABLE pre_trade_briefs
  ADD COLUMN IF NOT EXISTS event_risk_action TEXT,
  ADD COLUMN IF NOT EXISTS event_risk_summary TEXT,
  ADD COLUMN IF NOT EXISTS event_risk_window_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS event_risk_window_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_model TEXT,
  ADD COLUMN IF NOT EXISTS prompt_version TEXT,
  ADD COLUMN IF NOT EXISTS generation_latency_ms INTEGER;

ALTER TABLE pre_trade_briefs
  DROP CONSTRAINT IF EXISTS pre_trade_briefs_event_risk_action_check;

ALTER TABLE pre_trade_briefs
  ADD CONSTRAINT pre_trade_briefs_event_risk_action_check
  CHECK (event_risk_action IN ('proceed', 'size_down', 'wait') OR event_risk_action IS NULL);

ALTER TABLE market_bias_reports
  ADD COLUMN IF NOT EXISTS ai_model TEXT,
  ADD COLUMN IF NOT EXISTS prompt_version TEXT,
  ADD COLUMN IF NOT EXISTS generation_latency_ms INTEGER;
