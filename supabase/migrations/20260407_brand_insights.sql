-- Brand insights: stores metadata about uploaded CSV files (Meta Ads, etc.)
CREATE TABLE IF NOT EXISTS brand_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  csv_filename text,
  uploaded_at timestamptz DEFAULT now(),
  date_range_start date,
  date_range_end date,
  row_count integer
);

ALTER TABLE brand_insights ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own insights, or insights for brands they own
CREATE POLICY "insights_own_user" ON brand_insights
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
  );

-- Brand insight rows: individual data rows from uploaded CSVs
CREATE TABLE IF NOT EXISTS brand_insight_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  insight_id uuid NOT NULL REFERENCES brand_insights(id) ON DELETE CASCADE,
  date date,
  campaign_name text,
  ad_set_name text,
  age text,
  gender text,
  placement text,
  impressions integer,
  clicks integer,
  ctr numeric,
  spend numeric,
  results integer,
  cost_per_result numeric
);

-- Prevent duplicate rows across uploads for the same brand/date/campaign/breakdown
ALTER TABLE brand_insight_rows
  ADD CONSTRAINT brand_insight_rows_unique_breakdown
  UNIQUE (brand_id, date, campaign_name, ad_set_name, age, gender, placement);

ALTER TABLE brand_insight_rows ENABLE ROW LEVEL SECURITY;

-- Users can read/write rows for brands they own, or via the parent insight's user_id
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

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_brand_insights_brand_id ON brand_insights(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_insight_rows_brand_id ON brand_insight_rows(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_insight_rows_insight_id ON brand_insight_rows(insight_id);
CREATE INDEX IF NOT EXISTS idx_brand_insight_rows_date ON brand_insight_rows(brand_id, date);
