-- Creates page_activity table for real-time analytics
create table if not exists public.page_activity (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  type text not null check (type in ('page_view','action','page_duration')),
  path text not null,
  name text,
  referrer text,
  meta jsonb,
  duration_ms integer,
  session_id text,
  viewport_w integer,
  viewport_h integer,
  tz text,
  user_id uuid,
  user_email text,
  user_agent text,
  ip text
);

-- Optional index to query recent activity
create index if not exists idx_page_activity_created_at on public.page_activity (created_at desc);
create index if not exists idx_page_activity_type on public.page_activity (type);
create index if not exists idx_page_activity_user on public.page_activity (user_id);

-- Enable realtime
-- Requires supabase Realtime enabled for the schema/table
-- alter publication supabase_realtime add table public.page_activity;

