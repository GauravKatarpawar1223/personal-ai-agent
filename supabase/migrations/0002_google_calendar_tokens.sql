-- Personal AI Agent — Google Calendar OAuth token storage
--
-- Run this in your Supabase project's SQL Editor after 0001_init.sql.
--
-- Why a new table instead of adding columns to `connections`:
-- `connections` is shared by every provider (Gmail, Calendar, Drive,
-- WhatsApp, GitHub, ...) and is read by the Connections page for every
-- one of them. Encrypted OAuth tokens are sensitive, provider-specific,
-- and only ever read by server-side Calendar API calls — giving them
-- their own narrow table keeps that access pattern easy to audit and
-- means a bug in generic connection-status code can never accidentally
-- select a token column. `connections` still remains the single source
-- of truth for "is this connected" (used by the Connections UI and
-- lib/data/connections.ts); this table exists only to make real
-- Calendar API calls possible once it says "connected".

create table if not exists public.google_oauth_credentials (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- AES-256-GCM ciphertext, base64: iv + authTag + ciphertext concatenated
  -- (see lib/security/token-encryption.ts). Never stored or logged as
  -- plaintext anywhere in the app.
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  access_token_expires_at timestamptz not null,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_oauth_credentials enable row level security;

-- A user can only ever see or touch their own row. There is no
-- service-role bypass anywhere in the app's code — every read/write of
-- this table happens through the signed-in user's own Supabase client.
create policy "google oauth credentials are owned by their user"
  on public.google_oauth_credentials for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.touch_google_oauth_credentials()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_google_oauth_credentials_updated on public.google_oauth_credentials;
create trigger on_google_oauth_credentials_updated
  before update on public.google_oauth_credentials
  for each row execute procedure public.touch_google_oauth_credentials();
