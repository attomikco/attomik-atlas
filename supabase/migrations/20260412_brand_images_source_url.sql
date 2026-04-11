-- Track the original scraped URL for each brand_images row.
-- Enables re-scraping, dedup across re-scrapes, and broken-link detection.
ALTER TABLE brand_images
  ADD COLUMN IF NOT EXISTS source_url text;

CREATE INDEX IF NOT EXISTS brand_images_source_url_idx
  ON brand_images (brand_id, source_url);
