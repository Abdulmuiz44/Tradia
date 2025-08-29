-- MT5 Integration Database Setup (Supabase compatible)
-- Safe to run multiple times

-- 1) Extensions
-- Use pgcrypto for UUID generation on Supabase
create extension if not exists "pgcrypto";

-- 2) Tables

-- MT5 Credentials Table
create table if not exists mt5_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name varchar(255) not null,
  server varchar(255) not null,
  login varchar(50) not null,
  encrypted_password jsonb not null, -- { encrypted, iv, tag, algorithm }
  is_active boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  rotation_required boolean not null default false,
  security_level varchar(20) not null default 'medium'
    check (security_level in ('high', 'medium', 'low'))
  -- Optional FK to auth.users (uncomment if you want hard FK)
  -- , constraint fk_mt5_credentials_user
  --   foreign key (user_id) references auth.users(id) on delete cascade
);

-- Connection History Table
create table if not exists mt5_connection_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  credential_id uuid references mt5_credentials(id) on delete set null,
  server varchar(255) not null,
  login varchar(50) not null,
  action varchar(50) not null,   -- 'connect','disconnect','sync','validate','error'
  status varchar(50) not null,   -- 'success','failed','timeout','cancelled'
  started_at timestamptz not null,
  completed_at timestamptz,
  duration_ms integer,
  error_type varchar(100),
  error_message text,
  ip_address inet,
  user_agent text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Sync Sessions Table
create table if not exists mt5_sync_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  credential_id uuid not null references mt5_credentials(id) on delete cascade,
  status varchar(50) not null default 'running', -- 'running','completed','failed','cancelled'
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  total_trades integer not null default 0,
  new_trades integer not null default 0,
  updated_trades integer not null default 0,
  from_date date,
  to_date date,
  progress_percentage integer not null default 0
    check (progress_percentage >= 0 and progress_percentage <= 100),
  error_message text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Connection Monitoring Table
create table if not exists mt5_connection_monitoring (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  credential_id uuid not null references mt5_credentials(id) on delete cascade,
  status varchar(50) not null, -- 'online','offline','degraded','unknown'
  response_time_ms integer,
  last_check_at timestamptz not null default now(),
  consecutive_failures integer not null default 0,
  total_checks integer not null default 0,
  uptime_percentage decimal(5,2) not null default 100.00,
  error_message text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- ensure one monitoring record per credential per user
  unique (user_id, credential_id)
);

-- Security Audit Table
create table if not exists mt5_security_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  credential_id uuid references mt5_credentials(id) on delete set null,
  action varchar(100) not null,  -- 'credential_created','credential_updated','credential_deleted','key_rotated',...
  severity varchar(20) not null default 'info', -- 'critical','high','medium','low','info'
  ip_address inet,
  user_agent text,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- 3) Indexes

-- Credentials: performant lookups
create index if not exists idx_mt5_credentials_user_id on mt5_credentials(user_id);
create index if not exists idx_mt5_credentials_active on mt5_credentials(is_active) where is_active = true;
create index if not exists idx_mt5_credentials_rotation on mt5_credentials(rotation_required) where rotation_required = true;

-- Enforce one ACTIVE credential per (user, server, login)
-- (Partial unique index is better than a UNIQUE including a boolean column)
create unique index if not exists uniq_mt5_active_credential
  on mt5_credentials(user_id, server, login)
  where is_active = true;

-- Connection history
create index if not exists idx_mt5_connection_history_user_id on mt5_connection_history(user_id);
create index if not exists idx_mt5_connection_history_credential_id on mt5_connection_history(credential_id);
create index if not exists idx_mt5_connection_history_action on mt5_connection_history(action);
create index if not exists idx_mt5_connection_history_status on mt5_connection_history(status);
create index if not exists idx_mt5_connection_history_started_at on mt5_connection_history(started_at desc);

-- Sync sessions
create index if not exists idx_mt5_sync_sessions_user_id on mt5_sync_sessions(user_id);
create index if not exists idx_mt5_sync_sessions_credential_id on mt5_sync_sessions(credential_id);
create index if not exists idx_mt5_sync_sessions_status on mt5_sync_sessions(status);
create index if not exists idx_mt5_sync_sessions_started_at on mt5_sync_sessions(started_at desc);

-- Monitoring
create index if not exists idx_mt5_connection_monitoring_status on mt5_connection_monitoring(status);
create index if not exists idx_mt5_connection_monitoring_last_check on mt5_connection_monitoring(last_check_at desc);

-- Security audit
create index if not exists idx_mt5_security_audit_user_id on mt5_security_audit(user_id);
create index if not exists idx_mt5_security_audit_action on mt5_security_audit(action);
create index if not exists idx_mt5_security_audit_severity on mt5_security_audit(severity);
create index if not exists idx_mt5_security_audit_created_at on mt5_security_audit(created_at desc);

-- 4) Triggers: updated_at management

create or replace function update_mt5_credentials_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function update_mt5_sync_sessions_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function update_mt5_connection_monitoring_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_mt5_credentials_updated_at on mt5_credentials;
drop trigger if exists trigger_mt5_sync_sessions_updated_at on mt5_sync_sessions;
drop trigger if exists trigger_mt5_connection_monitoring_updated_at on mt5_connection_monitoring;

create trigger trigger_mt5_credentials_updated_at
  before update on mt5_credentials
  for each row
  execute function update_mt5_credentials_updated_at();

create trigger trigger_mt5_sync_sessions_updated_at
  before update on mt5_sync_sessions
  for each row
  execute function update_mt5_sync_sessions_updated_at();

create trigger trigger_mt5_connection_monitoring_updated_at
  before update on mt5_connection_monitoring
  for each row
  execute function update_mt5_connection_monitoring_updated_at();

-- 5) Optional sample data (REMOVE in production)
-- replace '00000000-0000-0000-0000-000000000000' with a real user id
/*
insert into mt5_credentials (
  user_id, name, server, login, encrypted_password, security_level
) values (
  '00000000-0000-0000-0000-000000000000',
  'Demo Account',
  'DemoServer-MT5',
  '123456',
  '{"encrypted":"sample_encrypted_data","iv":"sample_iv","tag":"sample_tag","algorithm":"aes-256-gcm"}'::jsonb,
  'high'
) on conflict do nothing;
*/

-- 6) Permissions & RLS (adjust to your security model)
-- In Supabase, prefer RLS + granular policies over GRANT ALL.

/*
alter table mt5_credentials enable row level security;
alter table mt5_connection_history enable row level security;
alter table mt5_sync_sessions enable row level security;
alter table mt5_connection_monitoring enable row level security;
alter table mt5_security_audit enable row level security;

-- mt5_credentials
create policy "read own credentials" on mt5_credentials
  for select using (auth.uid() = user_id);

create policy "insert own credentials" on mt5_credentials
  for insert with check (auth.uid() = user_id);

create policy "update own credentials" on mt5_credentials
  for update using (auth.uid() = user_id);

create policy "delete own credentials" on mt5_credentials
  for delete using (auth.uid() = user_id);

-- Repeat similar owner-scoped policies for the other tables, e.g.:
create policy "read own history" on mt5_connection_history
  for select using (auth.uid() = user_id);

create policy "insert own history" on mt5_connection_history
  for insert with check (auth.uid() = user_id);

-- etc.
*/
