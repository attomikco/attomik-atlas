CREATE TABLE store_themes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  brand_id uuid not null references brands(id) on delete cascade,
  name text not null default 'Default theme',
  color_variants jsonb,
  selected_variant int default 0,
  index_json jsonb,
  product_json jsonb,
  footer_group_json jsonb,
  image_assignments jsonb,
  shopify_theme_id bigint,
  shopify_theme_name text,
  last_deployed_at timestamptz,
  last_deploy_status text check (last_deploy_status in ('idle','deploying','success','failed')) default 'idle',
  last_deploy_error text
);

CREATE UNIQUE INDEX store_themes_brand_id_unique ON store_themes(brand_id);
ALTER TABLE store_themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store_themes_member_access" ON store_themes
  FOR ALL TO authenticated
  USING (brand_id IN (SELECT brand_id FROM brand_members WHERE user_id = auth.uid()));
