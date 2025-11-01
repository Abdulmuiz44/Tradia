-- TradingView feature runs tracking
create table if not exists tv_feature_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  feature text not null check (feature in ('alerts','backtest','portfolio','patterns','screener','broker')),
  plan text not null,
  payload jsonb,
  result jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists tv_feature_runs_user_feature_idx
  on tv_feature_runs (user_id, feature, created_at desc);

create index if not exists tv_feature_runs_created_idx
  on tv_feature_runs (created_at desc);

comment on table tv_feature_runs is 'Stores executions of TradingView sync features for quota enforcement and analytics.';
