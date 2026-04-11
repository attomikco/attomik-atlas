-- Email templates: per-brand saved email configurations, each with its own
-- MasterEmailConfig. The "master" type is the default brand template that
-- backs brands.notes.email_config for backward compatibility with the preview
-- page. Other types (welcome, abandoned_cart, etc.) are campaign/lifecycle
-- specific variants built on top of the same MasterEmailConfig shape.
create table email_templates (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  brand_id uuid references brands(id) on delete cascade,
  name text not null,
  type text not null check (type in ('master', 'welcome', 'abandoned_cart', 'post_purchase', 'newsletter', 'promotion', 'custom')),
  brief text,
  email_config jsonb,
  status text default 'draft' check (status in ('draft', 'ready')),
  klaviyo_template_id text
);

alter table email_templates enable row level security;

create policy "authenticated_all" on email_templates
  for all to authenticated
  using (true)
  with check (true);
