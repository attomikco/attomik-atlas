-- ============================================
-- ATTOMIK MARKETING OS — SUPABASE SCHEMA
-- Run this in your new Supabase SQL editor
-- ============================================

create extension if not exists "uuid-ossp";

-- ============================================
-- BRANDS
-- ============================================
create table brands (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  name text not null,
  slug text unique not null,
  website text,
  industry text,
  status text default 'active' check (status in ('active', 'paused', 'offboarded')),
  primary_color text,
  secondary_color text,
  accent_color text,
  font_primary text,
  font_secondary text,
  brand_voice text,
  target_audience text,
  tone_keywords text[],
  avoid_words text[],
  client_name text,
  client_email text,
  notes text,
  -- Structured brand profile
  mission text,
  vision text,
  values text[],
  competitors jsonb default '[]',
  products jsonb default '[]',
  customer_personas jsonb default '[]'
);

-- ============================================
-- BRAND ASSETS (files in Supabase Storage)
-- ============================================
create table brand_assets (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  brand_id uuid references brands(id) on delete cascade,
  type text not null check (type in ('guidelines', 'html_template', 'logo', 'other')),
  file_name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  notes text,
  parsed_text text
);

-- ============================================
-- BRAND VOICE EXAMPLES
-- ============================================
create table brand_voice_examples (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  brand_id uuid references brands(id) on delete cascade,
  category text not null check (category in ('good', 'bad')),
  label text,
  content text not null,
  notes text
);

-- ============================================
-- CAMPAIGNS
-- ============================================
create table campaigns (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  brand_id uuid references brands(id) on delete cascade,
  name text not null,
  type text not null check (type in ('email', 'ad_copy', 'social', 'seo', 'dtc_brief')),
  status text default 'draft' check (status in ('draft', 'in_review', 'approved', 'scheduled', 'sent', 'archived')),
  subject text,
  platform text,
  goal text,
  key_message text,
  offer text,
  audience_notes text,
  scheduled_at timestamptz,
  sent_at timestamptz,
  from_name text,
  from_email text,
  reply_to text,
  preview_text text
);

-- ============================================
-- GENERATED CONTENT
-- ============================================
create table generated_content (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  campaign_id uuid references campaigns(id) on delete cascade,
  brand_id uuid references brands(id) on delete cascade,
  type text not null,
  version integer default 1,
  content text not null,
  prompt_used text,
  is_approved boolean default false,
  approved_at timestamptz,
  notes text
);

-- ============================================
-- EMAIL SENDS LOG
-- ============================================
create table email_sends (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  campaign_id uuid references campaigns(id),
  brand_id uuid references brands(id),
  content_id uuid references generated_content(id),
  resend_id text,
  recipient_count integer,
  status text default 'pending' check (status in ('pending', 'sent', 'failed')),
  error_message text,
  metadata jsonb
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table brands enable row level security;
alter table brand_assets enable row level security;
alter table brand_voice_examples enable row level security;
alter table campaigns enable row level security;
alter table generated_content enable row level security;
alter table email_sends enable row level security;

create policy "authenticated_all" on brands for all to authenticated using (true);
create policy "authenticated_all" on brand_assets for all to authenticated using (true);
create policy "authenticated_all" on brand_voice_examples for all to authenticated using (true);
create policy "authenticated_all" on campaigns for all to authenticated using (true);
create policy "authenticated_all" on generated_content for all to authenticated using (true);
create policy "authenticated_all" on email_sends for all to authenticated using (true);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger brands_updated_at before update on brands
  for each row execute function update_updated_at();

create trigger campaigns_updated_at before update on campaigns
  for each row execute function update_updated_at();

-- ============================================
-- SEED — Attomik clients
-- ============================================
insert into brands (name, slug, website, industry, status, tone_keywords) values
  ('Summer Water', 'summer-water', 'https://summerwater.com', 'DTC Wine', 'active', array['playful','summery','approachable']),
  ('BABE Wine', 'babe-wine', 'https://drinkbabe.com', 'DTC Wine', 'active', array['fun','bold','social']),
  ('Jolene Coffee', 'jolene-coffee', 'https://jolenecoffee.com', 'DTC Coffee', 'active', array['warm','artisan','community']),
  ('Good Twine', 'good-twine', 'https://goodtwine.com', 'DTC Home Goods', 'active', array['sustainable','minimal','considered']),
  ('Afterdream', 'afterdream', null, 'DTC', 'active', array['editorial','aspirational','modern']);
