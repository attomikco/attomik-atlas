-- Landing pages: per-brand block-based page documents, one row per (brand_id, slug).
-- Companion to /app/(app)/landing-page/ builder (Phase 1+).
--
-- `content` holds the canonical page document:
--   { blocks: Block[], pageSettings: PageSettings, version: number }
--
-- `updated_at` is maintained by the application layer on PATCH
-- (src/app/api/landing-pages/[id]/route.ts). Matches the convention used by
-- other tables in this repo (profiles, store_themes, email_templates) —
-- no shared touch_updated_at trigger function exists.
--
-- RLS mirrors the store_themes pattern: access gated via brand_members, the
-- authority for brand access since 20260413_brand_teams.sql.
create table landing_pages (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  brand_id      uuid not null references brands(id) on delete cascade,
  campaign_id   uuid references campaigns(id) on delete set null,
  name          text not null,
  slug          text not null,
  meta          text,
  content       jsonb not null,
  status        text default 'draft' check (status in ('draft','published','archived')),
  published_url text,
  unique (brand_id, slug)
);

create index landing_pages_brand on landing_pages(brand_id);
create index landing_pages_campaign on landing_pages(campaign_id);

alter table landing_pages enable row level security;

create policy landing_pages_member_access on landing_pages
  for all to authenticated
  using (brand_id in (select brand_id from brand_members where user_id = auth.uid()))
  with check (brand_id in (select brand_id from brand_members where user_id = auth.uid()));
