-- Add the about_json column to store_themes. The generator produces a 4th
-- merged template (templates/store/base-about.json → per-brand about page)
-- alongside the existing index_json / product_json / footer_group_json. The
-- deploy route pushes it to templates/page.about.json on the Shopify theme.
--
-- Nullable on purpose: legacy rows generated before this migration will
-- read back NULL until their next /generate run, at which point the
-- pipeline upserts a full about_json. The editor + deploy handle NULL
-- gracefully (skip the section / skip the asset).

ALTER TABLE store_themes
  ADD COLUMN about_json jsonb;
