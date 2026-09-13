-- Personal AI Agent — Phase 2 initial schema
--
-- Run this once in your Supabase project's SQL Editor (or via the
-- Supabase CLI: `supabase db push`). It creates every table Phase 2
-- reads from and writes to, all scoped to the signed-in user via Row
-- Level Security. Nothing here is optional — the app assumes this
-- schema exists.

-- Needed for gen_random_uuid().
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- profiles — one row per auth.users row, created automatically on signup
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are viewable by their owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles are editable by their owner"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------
-- conversations
-- ---------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.conversations enable row level security;

create policy "conversations are owned by their creator"
  on public.conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists conversations_user_id_updated_at_idx
  on public.conversations (user_id, updated_at desc);

-- ---------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'agent', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "messages are owned by their creator"
  on public.messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists messages_conversation_id_created_at_idx
  on public.messages (conversation_id, created_at asc);

-- Bump the parent conversation's updated_at whenever a message is added,
-- so the sidebar's "most recent" ordering stays accurate.
create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists on_message_created on public.messages;
create trigger on_message_created
  after insert on public.messages
  for each row execute procedure public.touch_conversation();

-- ---------------------------------------------------------------------
-- connections — which third-party providers a user has actually
-- connected. No row for a provider means "not connected".
-- ---------------------------------------------------------------------
create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider_id text not null,
  status text not null default 'connected' check (status in ('connected')),
  scopes text[],
  connected_at timestamptz not null default now(),
  unique (user_id, provider_id)
);

alter table public.connections enable row level security;

create policy "connections are owned by their creator"
  on public.connections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- activity_log
-- ---------------------------------------------------------------------
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  action text not null,
  tool text not null,
  status text not null check (status in ('completed', 'waiting_for_approval', 'failed', 'in_progress')),
  created_at timestamptz not null default now()
);

alter table public.activity_log enable row level security;

create policy "activity is owned by its creator"
  on public.activity_log for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists activity_log_user_id_created_at_idx
  on public.activity_log (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- tool_executions — one row per real tool invocation (e.g. a web search)
-- ---------------------------------------------------------------------
create table if not exists public.tool_executions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  tool_id text not null,
  tool_name text not null,
  status text not null check (status in ('pending_approval', 'in_progress', 'completed', 'failed', 'cancelled')),
  summary text not null default '',
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.tool_executions enable row level security;

create policy "tool executions are owned by their creator"
  on public.tool_executions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- permission_requests — approval history for execute-level actions.
-- Nothing in Phase 2 auto-approves or executes these; the row is a
-- record of what was asked and how the user responded.
-- ---------------------------------------------------------------------
create table if not exists public.permission_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  title text not null,
  description text not null,
  impact text not null check (
    impact in ('send_message', 'purchase', 'booking', 'delete_data', 'account_change', 'other')
  ),
  details jsonb not null default '{}'::jsonb,
  resolved boolean not null default false,
  approved boolean,
  created_at timestamptz not null default now()
);

alter table public.permission_requests enable row level security;

create policy "permission requests are owned by their creator"
  on public.permission_requests for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
