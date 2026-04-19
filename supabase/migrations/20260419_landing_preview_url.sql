-- Pointer to the frozen landing-page HTML snapshot in Supabase Storage
-- (bucket: landing-previews, path: {brand_id}.html). The old
-- generated_html TEXT column (migration 20260416_landing_html_cache.sql)
-- continues to exist for backward compatibility until the one-off
-- migration script has moved all existing rows; it will be dropped in a
-- later migration.

alter table generated_content
  add column if not exists landing_preview_url text;
