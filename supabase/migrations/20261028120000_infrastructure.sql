-- Milestone 1: infrastructure tables, RLS and session lookup.

-- Global maintenance lock used by full restores (Milestone 7).
create table public.app_state (
  id smallint primary key default 1 check (id = 1),
  maintenance_mode boolean not null default false,
  maintenance_until timestamptz,
  restore_id uuid,
  updated_at timestamptz not null default now()
);
insert into public.app_state (id) values (1) on conflict do nothing;

-- Change signals for Realtime; carries no financial data.
create table public.change_signals (
  id smallint primary key default 1 check (id = 1),
  data_epoch bigint not null default 0,
  auth_epoch bigint not null default 0,
  changed_at timestamptz not null default now()
);
insert into public.change_signals (id) values (1) on conflict do nothing;

-- Failed login/reset attempts for rate limiting. Stores only a hashed IP.
create table public.login_attempts (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('login', 'reset')),
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index login_attempts_lookup_idx on public.login_attempts (kind, ip_hash, created_at);

alter table public.app_state enable row level security;
alter table public.change_signals enable row level security;
alter table public.login_attempts enable row level security;

revoke all on public.app_state, public.change_signals, public.login_attempts from anon, authenticated;

-- Signup is disabled and there is exactly one Auth user, so "authenticated"
-- is the family user (see ADR-3).
grant select on public.change_signals to authenticated;
create policy change_signals_select on public.change_signals
  for select to authenticated using (true);

-- app_state and login_attempts have no policies: server (secret key) only.

-- Returns the creation time of an Auth session, or null if it no longer exists.
create function public.session_created_at(p_session_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select s.created_at from auth.sessions s where s.id = p_session_id;
$$;

revoke execute on function public.session_created_at(uuid) from public, anon, authenticated;
grant execute on function public.session_created_at(uuid) to service_role;
