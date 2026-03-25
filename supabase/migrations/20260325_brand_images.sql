-- Brand image library
create table if not exists brand_images (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  brand_id uuid references brands(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  tag text default 'other' check (tag in ('product', 'lifestyle', 'ugc', 'background', 'seasonal', 'other')),
  alt_text text,
  width integer,
  height integer
);

alter table brand_images enable row level security;
create policy "authenticated_all" on brand_images for all to authenticated using (true);
