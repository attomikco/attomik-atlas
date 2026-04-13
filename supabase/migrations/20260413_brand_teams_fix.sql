-- Fix for 20260413_brand_teams.sql — resolves:
--   1. "infinite recursion detected in policy for relation brand_members"
--      (self-referencing RLS subqueries in brand_members, brands, and
--      brand_invites policies)
--   2. Missing brand_members row for brands created or claimed after the
--      initial migration ran — the BrandProvider returned an empty list
--      because RLS correctly filtered them out.
--
-- Safe to re-run: every policy is guarded with `drop ... if exists` and the
-- backfill uses `on conflict do nothing`.

-- ─── 1. Security-definer helpers ──────────────────────────────
-- These run with elevated privileges so the inner select on brand_members
-- does NOT re-trigger the policy being evaluated, breaking the recursion.

create or replace function public.user_brand_role(bid uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.brand_members
  where brand_id = bid and user_id = auth.uid()
  limit 1
$$;

create or replace function public.is_brand_member(bid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1 from public.brand_members
    where brand_id = bid and user_id = auth.uid()
  )
$$;

-- ─── 2. Replace every self-referencing policy ─────────────────

drop policy if exists "Members can view their brand's members" on brand_members;
create policy "Members can view their brand's members"
  on brand_members for select
  using (user_id = auth.uid() or public.is_brand_member(brand_id));

drop policy if exists "Admins and owners can insert members" on brand_members;
create policy "Admins and owners can insert members"
  on brand_members for insert
  with check (public.user_brand_role(brand_id) in ('owner', 'admin'));

drop policy if exists "Owners can delete members" on brand_members;
create policy "Owners can delete members"
  on brand_members for delete
  using (public.user_brand_role(brand_id) = 'owner');

drop policy if exists "Team members can view invites for their brand" on brand_invites;
create policy "Team members can view invites for their brand"
  on brand_invites for select
  using (public.is_brand_member(brand_id));

drop policy if exists "Admins and owners can create invites" on brand_invites;
create policy "Admins and owners can create invites"
  on brand_invites for insert
  with check (public.user_brand_role(brand_id) in ('owner', 'admin'));

drop policy if exists "Admins and owners can delete invites" on brand_invites;
create policy "Admins and owners can delete invites"
  on brand_invites for delete
  using (public.user_brand_role(brand_id) in ('owner', 'admin'));

drop policy if exists "Brand members can view their brands" on brands;
create policy "Brand members can view their brands"
  on brands for select
  using (public.is_brand_member(id));

drop policy if exists "Brand members can update their brands" on brands;
create policy "Brand members can update their brands"
  on brands for update
  using (public.is_brand_member(id));

drop policy if exists "Owners can delete brands" on brands;
create policy "Owners can delete brands"
  on brands for delete
  using (public.user_brand_role(id) = 'owner');

-- ─── 3. Auto-create owner row whenever a brand gets a user_id ─
-- Covers both direct inserts with user_id populated and the anonymous
-- onboarding claim flow (update user_id from null → value at login time).

create or replace function public.handle_brand_user_assigned()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null
     and (tg_op = 'INSERT' or old.user_id is distinct from new.user_id) then
    insert into public.brand_members (brand_id, user_id, role)
    values (new.id, new.user_id, 'owner')
    on conflict (brand_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_brand_user_assigned on brands;
create trigger on_brand_user_assigned
  after insert or update of user_id on brands
  for each row execute procedure public.handle_brand_user_assigned();

-- ─── 4. Backfill — cover anything that slipped through ────────
insert into public.brand_members (brand_id, user_id, role)
select id, user_id, 'owner'
from public.brands
where user_id is not null
on conflict (brand_id, user_id) do nothing;
