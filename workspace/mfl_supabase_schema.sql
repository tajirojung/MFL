-- MoneyForLife / Family Wallet initial Supabase schema
-- Run this once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  photo_url text,
  family_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.users(id) on delete cascade,
  members uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users
  add constraint users_family_id_fkey
  foreign key (family_id) references public.families(id) on delete set null;

create table if not exists public.family_invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  family_name text not null,
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  sender_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('savings', 'credit_card')),
  balance numeric(14, 2) not null default 0,
  credit_limit numeric(14, 2),
  interest_rate numeric(8, 4),
  statement_date integer check (statement_date between 1 and 31),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  user_name text not null default '',
  family_id uuid references public.families(id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  type text not null check (type in ('income', 'expense')),
  category text not null,
  date date not null,
  description text not null default '',
  account_id uuid not null references public.accounts(id) on delete restrict,
  receipt_url text,
  is_recurring boolean not null default false,
  recurring_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  category text not null,
  amount numeric(14, 2) not null default 0 check (amount >= 0),
  month text not null,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, category, month)
);

create table if not exists public.recurring (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  family_id uuid,
  amount numeric(14, 2) not null check (amount > 0),
  name text not null,
  category text not null,
  payment_method text not null check (payment_method in ('cash', 'card')),
  account_id uuid not null references public.accounts(id) on delete restrict,
  is_installment boolean not null default false,
  installment_months integer,
  installment_interest numeric(8, 4),
  next_due_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recurring_incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  family_id uuid,
  name text not null,
  base_salary numeric(14, 2) not null default 0,
  ot numeric(14, 2) not null default 0,
  commission numeric(14, 2) not null default 0,
  incentive numeric(14, 2) not null default 0,
  other_income numeric(14, 2) not null default 0,
  freelance_income numeric(14, 2) not null default 0,
  total_amount numeric(14, 2) not null default 0,
  day_of_month integer not null check (day_of_month between 1 and 31),
  account_id uuid not null references public.accounts(id) on delete restrict,
  last_triggered_month text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.custom_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  family_id uuid,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  message text not null,
  type text not null check (type in ('warning', 'info', 'success')),
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_family_member(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.families f
    where f.id = p_family_id
      and (select auth.uid()) = any(f.members)
  );
$$;

create trigger set_users_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger set_families_updated_at before update on public.families
  for each row execute function public.set_updated_at();
create trigger set_family_invitations_updated_at before update on public.family_invitations
  for each row execute function public.set_updated_at();
create trigger set_accounts_updated_at before update on public.accounts
  for each row execute function public.set_updated_at();
create trigger set_transactions_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();
create trigger set_budgets_updated_at before update on public.budgets
  for each row execute function public.set_updated_at();
create trigger set_recurring_updated_at before update on public.recurring
  for each row execute function public.set_updated_at();
create trigger set_recurring_incomes_updated_at before update on public.recurring_incomes
  for each row execute function public.set_updated_at();
create trigger set_custom_categories_updated_at before update on public.custom_categories
  for each row execute function public.set_updated_at();
create trigger set_notifications_updated_at before update on public.notifications
  for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.families enable row level security;
alter table public.family_invitations enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.recurring enable row level security;
alter table public.recurring_incomes enable row level security;
alter table public.custom_categories enable row level security;
alter table public.notifications enable row level security;

create policy "users_select_own" on public.users for select to authenticated
  using ((select auth.uid()) = id);
create policy "users_insert_own" on public.users for insert to authenticated
  with check ((select auth.uid()) = id);
create policy "users_update_own" on public.users for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "families_select_member_or_invited" on public.families for select to authenticated
  using (
    (select auth.uid()) = any(members)
    or exists (
      select 1
      from public.family_invitations i
      where i.family_id = families.id
        and i.status = 'pending'
        and i.email = (select email from auth.users where id = (select auth.uid()))
    )
  );
create policy "families_insert_creator" on public.families for insert to authenticated
  with check ((select auth.uid()) = created_by and (select auth.uid()) = any(members));
create policy "families_update_member_or_invited_accept" on public.families for update to authenticated
  using (
    (select auth.uid()) = any(members)
    or exists (
      select 1
      from public.family_invitations i
      where i.family_id = families.id
        and i.status = 'pending'
        and i.email = (select email from auth.users where id = (select auth.uid()))
    )
  )
  with check (true);
create policy "families_delete_creator" on public.families for delete to authenticated
  using ((select auth.uid()) = created_by);

create policy "family_invitations_select_invited_or_member" on public.family_invitations for select to authenticated
  using (
    email = (select email from auth.users where id = (select auth.uid()))
    or public.is_family_member(family_id)
  );
create policy "family_invitations_insert_member" on public.family_invitations for insert to authenticated
  with check (public.is_family_member(family_id));
create policy "family_invitations_update_invited_or_member" on public.family_invitations for update to authenticated
  using (
    email = (select email from auth.users where id = (select auth.uid()))
    or public.is_family_member(family_id)
  )
  with check (
    email = (select email from auth.users where id = (select auth.uid()))
    or public.is_family_member(family_id)
  );

create policy "accounts_all_own" on public.accounts for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "transactions_all_own_or_family" on public.transactions for all to authenticated
  using ((select auth.uid()) = user_id or public.is_family_member(family_id))
  with check ((select auth.uid()) = user_id or public.is_family_member(family_id));

create policy "budgets_all_family" on public.budgets for all to authenticated
  using (family_id = (select auth.uid()) or public.is_family_member(family_id))
  with check (family_id = (select auth.uid()) or public.is_family_member(family_id));

create policy "recurring_all_own_or_family" on public.recurring for all to authenticated
  using ((select auth.uid()) = user_id or public.is_family_member(family_id))
  with check ((select auth.uid()) = user_id or public.is_family_member(family_id));

create policy "recurring_incomes_all_own_or_family" on public.recurring_incomes for all to authenticated
  using ((select auth.uid()) = user_id or public.is_family_member(family_id))
  with check ((select auth.uid()) = user_id or public.is_family_member(family_id));

create policy "custom_categories_all_own_or_family" on public.custom_categories for all to authenticated
  using ((select auth.uid()) = user_id or public.is_family_member(family_id))
  with check ((select auth.uid()) = user_id or public.is_family_member(family_id));

create policy "notifications_all_own" on public.notifications for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
