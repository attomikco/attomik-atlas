-- Add Meta credentials to brand_insights table (per brand)
-- Store in brands.notes JSON (no schema change needed)

-- Add creative fields to brand_insight_rows
ALTER TABLE brand_insight_rows
  ADD COLUMN IF NOT EXISTS ad_id text,
  ADD COLUMN IF NOT EXISTS creative_title text,
  ADD COLUMN IF NOT EXISTS creative_body text,
  ADD COLUMN IF NOT EXISTS creative_image_url text,
  ADD COLUMN IF NOT EXISTS creative_cta text,
  ADD COLUMN IF NOT EXISTS sync_source text DEFAULT 'csv'; -- 'csv' | 'meta_api'

-- Add index on ad_id for creative lookups
CREATE INDEX IF NOT EXISTS idx_brand_insight_rows_ad_id ON brand_insight_rows(ad_id);

-- Add last_meta_sync tracking to brand_insights
ALTER TABLE brand_insights
  ADD COLUMN IF NOT EXISTS sync_source text DEFAULT 'csv',
  ADD COLUMN IF NOT EXISTS meta_date_preset text;
