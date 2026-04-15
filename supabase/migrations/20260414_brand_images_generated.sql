-- Support AI-generated images in the brand library.
-- 1. Add nullable `source` column to track the generator (e.g. 'fal').
-- 2. Extend the tag CHECK constraint to allow the 'generated' bucket
--    so the Creative Studio image picker can show a dedicated section.

ALTER TABLE brand_images
  ADD COLUMN IF NOT EXISTS source text;

ALTER TABLE brand_images
  DROP CONSTRAINT IF EXISTS brand_images_tag_check;

ALTER TABLE brand_images
  ADD CONSTRAINT brand_images_tag_check
  CHECK (tag IN ('product', 'lifestyle', 'ugc', 'background', 'seasonal', 'other', 'logo', 'press', 'shopify', 'generated'));
