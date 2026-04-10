-- Drop old table and recreate with Meta Ads export columns
DROP TABLE IF EXISTS brand_insight_rows CASCADE;

CREATE TABLE brand_insight_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  insight_id uuid NOT NULL REFERENCES brand_insights(id) ON DELETE CASCADE,
  date date,
  campaign_name text,
  ad_set_name text,
  ad_name text,
  reach integer,
  impressions integer,
  clicks integer,
  ctr numeric,
  cpm numeric,
  spend numeric,
  results integer,
  cost_per_result numeric,
  result_type text,
  purchases integer,
  purchase_value numeric,
  roas numeric,
  delivery_status text
);

-- Unique constraint on the new dedup key (no age/gender/placement)
ALTER TABLE brand_insight_rows
  ADD CONSTRAINT brand_insight_rows_unique_v2
  UNIQUE (brand_id, date, campaign_name, ad_set_name, ad_name);

-- Index for common queries
CREATE INDEX idx_brand_insight_rows_brand_date ON brand_insight_rows(brand_id, date);

ALTER TABLE brand_insight_rows ENABLE ROW LEVEL SECURITY;

-- RLS: users can read/write rows for brands they own or via parent insight
CREATE POLICY "insight_rows_brand_owner" ON brand_insight_rows
  FOR ALL TO authenticated
  USING (
    brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
    OR insight_id IN (SELECT id FROM brand_insights WHERE user_id = auth.uid())
  )
  WITH CHECK (
    brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
    OR insight_id IN (SELECT id FROM brand_insights WHERE user_id = auth.uid())
  );
