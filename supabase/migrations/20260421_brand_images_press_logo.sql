-- Adds the `press_logo` tag so the scanner can isolate publication /
-- "as seen in" logos that used to leak into the `lifestyle` bucket and
-- surface as hero creatives in /preview (BEVNET, Forbes, Rolling Stone,
-- Essence, Wine Enthusiast, etc.). Kept as a distinct tag (not merged
-- into `logo`) so a future "Featured In" module can opt-in to pulling
-- just this set.
--
-- Also adds `classification_reason` so every row records which scanner
-- rule fired and why, feeding the admin image audit UI in
-- /brand-setup/[brandId] Section 5.

ALTER TABLE brand_images
  DROP CONSTRAINT IF EXISTS brand_images_tag_check;

ALTER TABLE brand_images
  ADD CONSTRAINT brand_images_tag_check
  CHECK (tag IN (
    'product',
    'lifestyle',
    'background',
    'ugc',
    'seasonal',
    'other',
    'logo',
    'press',
    'press_logo',
    'shopify',
    'generated'
  ));

ALTER TABLE brand_images
  ADD COLUMN IF NOT EXISTS classification_reason text;
