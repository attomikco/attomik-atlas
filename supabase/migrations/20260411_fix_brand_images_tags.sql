-- Fix schema drift: add missing tag values used in runtime code
ALTER TABLE brand_images
  DROP CONSTRAINT IF EXISTS brand_images_tag_check;

ALTER TABLE brand_images
  ADD CONSTRAINT brand_images_tag_check
  CHECK (tag IN ('product', 'lifestyle', 'ugc', 'background', 'seasonal', 'other', 'logo', 'press', 'shopify'));
