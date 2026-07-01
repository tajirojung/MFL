-- MoneyForLife Supabase policy fix
-- Run this in Supabase SQL Editor after the initial schema.
-- It lets invited users accept a family invitation without opening unrelated rows.

drop policy if exists "families_select_member" on public.families;
drop policy if exists "families_update_member" on public.families;

create policy "families_select_member_or_invited" on public.families
for select to authenticated
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

create policy "families_update_member_or_invited_accept" on public.families
for update to authenticated
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
