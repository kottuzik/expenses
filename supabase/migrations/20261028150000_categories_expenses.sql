-- Milestone 2: categories and expenses.

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 30),
  -- Duplicate check ignores extra whitespace and letter case.
  normalized_name text generated always as (lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))) stored,
  -- Closed 12-color palette from DESIGN.md 2.1.
  color text not null check (color in (
    '#84C441', '#2E7D32', '#14B8A6', '#3B82F6', '#6366F1', '#8B5CF6',
    '#EC4899', '#EF4444', '#F97316', '#F59E0B', '#A16207', '#6B7280'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version bigint not null default 1,
  constraint categories_normalized_name_key unique (normalized_name)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  amount numeric(9, 2) not null check (amount > 0 and amount <= 1000000),
  -- "Not in the future" is checked by the server in Asia/Jerusalem time.
  expense_date date not null check (expense_date >= date '2000-01-01'),
  category_id uuid not null references public.categories (id) on delete restrict,
  description text check (description is null or char_length(description) <= 200),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version bigint not null default 1
);

create index expenses_date_idx on public.expenses (expense_date desc, id);
create index expenses_category_date_idx on public.expenses (category_id, expense_date);
create index expenses_deleted_date_idx on public.expenses (deleted_at, expense_date);

-- Every update bumps updated_at and the row version (used for conflicts in Milestone 4).
create function public.bump_row_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.version := old.version + 1;
  return new;
end;
$$;

create trigger categories_bump_version before update on public.categories
  for each row execute function public.bump_row_version();
create trigger expenses_bump_version before update on public.expenses
  for each row execute function public.bump_row_version();

-- Initial categories, created once; staggered created_at keeps the PRD order.
insert into public.categories (name, color, created_at) values
  ('מזון', '#84C441', now()),
  ('ביגוד', '#EC4899', now() + interval '1 millisecond'),
  ('רשויות', '#3B82F6', now() + interval '2 milliseconds'),
  ('פנאי', '#F59E0B', now() + interval '3 milliseconds'),
  ('אחר', '#6B7280', now() + interval '4 milliseconds')
on conflict (normalized_name) do nothing;

-- Moves the category's expenses (including ones in the trash) to a replacement
-- and deletes it, in one transaction. At least one category must remain.
create function public.delete_category(p_id uuid, p_replacement_id uuid default null)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_has_expenses boolean;
begin
  -- Serializes category deletions so two parallel deletes cannot remove the last one.
  perform pg_advisory_xact_lock(hashtext('public.delete_category'));

  if not exists (select 1 from public.categories where id = p_id) then
    raise exception 'category_not_found' using errcode = 'P0002';
  end if;

  if (select count(*) from public.categories) <= 1 then
    raise exception 'last_category' using errcode = 'P0001';
  end if;

  select exists (select 1 from public.expenses where category_id = p_id) into v_has_expenses;

  if v_has_expenses then
    if p_replacement_id is null then
      raise exception 'replacement_required' using errcode = 'P0001';
    end if;
    if p_replacement_id = p_id
      or not exists (select 1 from public.categories where id = p_replacement_id) then
      raise exception 'replacement_invalid' using errcode = 'P0001';
    end if;
    update public.expenses set category_id = p_replacement_id where category_id = p_id;
  end if;

  delete from public.categories where id = p_id;
end;
$$;

-- Server-only access (secret key); the browser never reads these tables directly.
alter table public.categories enable row level security;
alter table public.expenses enable row level security;
revoke all on public.categories, public.expenses from anon, authenticated;

revoke execute on function public.delete_category(uuid, uuid) from public, anon, authenticated;
grant execute on function public.delete_category(uuid, uuid) to service_role;
revoke execute on function public.bump_row_version() from public, anon, authenticated;
