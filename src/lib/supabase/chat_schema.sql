-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- CONVERSATIONS TABLE
create table if not exists conversations (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text default 'New Conversation',
  model text default 'mistral-medium',
  mode text default 'assistant',
  pinned boolean default false,
  archived boolean default false,
  last_message_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CHAT MESSAGES TABLE
create table if not exists chat_messages (
  id text primary key,
  conversation_id text references conversations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text check (type in ('user', 'assistant', 'system')) not null,
  content text not null,
  attached_trade_ids text[], -- Array of trade UUIDs
  mode text,
  created_at timestamptz default now()
);

-- RLS POLICIES (Row Level Security)
alter table conversations enable row level security;
alter table chat_messages enable row level security;

-- Conversations Policies
create policy "Users can view their own conversations"
  on conversations for select
  using (auth.uid() = user_id);

create policy "Users can insert their own conversations"
  on conversations for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own conversations"
  on conversations for update
  using (auth.uid() = user_id);

create policy "Users can delete their own conversations"
  on conversations for delete
  using (auth.uid() = user_id);

-- Messages Policies
create policy "Users can view messages in their conversations"
  on chat_messages for select
  using (auth.uid() = user_id);

create policy "Users can insert messages in their conversations"
  on chat_messages for insert
  with check (auth.uid() = user_id);
