-- Brand team membership + email invites.
-- Depends on: profiles (20260413_profiles.sql), brands.user_id (existing).

create extension if not exists "pgcrypto";

-- ─── brand_members ────────────────────────────────────────────
create table brand_members (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  invited_by uuid references profiles(id),
  created_at timestamptz default now(),
  unique(brand_id, user_id)
);

-- ─── brand_invites ────────────────────────────────────────────
create table brand_invites (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands(id) on delete cascade not null,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  token text unique not null default encode(gen_random_bytes(32), 'hex'),
  invited_by uuid references profiles(id),
  accepted_at timestamptz,
  expires_at timestamptz default now() + interval '7 days',
  created_at timestamptz default now()
);

-- ─── brand_members RLS ────────────────────────────────────────
alter table brand_members enable row level security;

create policy "Members can view their brand's members"
  on brand_members for select
  using (
    user_id = auth.uid() or
    brand_id in (select brand_id from brand_members where user_id = auth.uid())
  );

create policy "Admins and owners can insert members"
  on brand_members for insert
  with check (
    brand_id in (
      select brand_id from brand_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Owners can delete members"
  on brand_members for delete
  using (
    brand_id in (
      select brand_id from brand_members
      where user_id = auth.uid() and role = 'owner'
    )
  );

-- ─── brand_invites RLS ────────────────────────────────────────
alter table brand_invites enable row level security;

create policy "Team members can view invites for their brand"
  on brand_invites for select
  using (
    brand_id in (select brand_id from brand_members where user_id = auth.uid())
  );

create policy "Admins and owners can create invites"
  on brand_invites for insert
  with check (
    brand_id in (
      select brand_id from brand_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Admins and owners can delete invites"
  on brand_invites for delete
  using (
    brand_id in (
      select brand_id from brand_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ─── Backfill existing brand creators as owners ───────────────
-- Requires brands.user_id to exist (added in an earlier migration; see the
-- login page which writes to it during magic-link claim).
insert into brand_members (brand_id, user_id, role)
select id, user_id, 'owner'
from brands
where user_id is not null
on conflict (brand_id, user_id) do nothing;

-- ─── Update brands RLS to allow all brand_members access ──────
drop policy if exists "Users can view own brands" on brands;
drop policy if exists "authenticated_all" on brands;

create policy "Brand members can view their brands"
  on brands for select
  using (
    id in (select brand_id from brand_members where user_id = auth.uid())
  );

create policy "Brand members can update their brands"
  on brands for update
  using (
    id in (select brand_id from brand_members where user_id = auth.uid())
  );

create policy "Authenticated users can insert brands"
  on brands for insert
  to authenticated
  with check (true);

create policy "Owners can delete brands"
  on brands for delete
  using (
    id in (
      select brand_id from brand_members
      where user_id = auth.uid() and role = 'owner'
    )
  );
