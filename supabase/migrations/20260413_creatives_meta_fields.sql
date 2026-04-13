-- Meta ad launch fields for saved_creatives.
-- Additive: every column uses `if not exists`, safe to re-run.

-- Destination URL — per-creative landing page override; falls back to
-- brand.website at launch time when null.
alter table saved_creatives
  add column if not exists destination_url text;

-- Meta CTA button type — enum of the canonical FB call_to_action_type values
-- we expose in the UI. The text-only cta_text stays as the label rendered on
-- the creative; cta_type is what Meta Ads Manager wants when launching.
alter table saved_creatives
  add column if not exists cta_type text default 'LEARN_MORE'
  check (cta_type in (
    'SHOP_NOW', 'LEARN_MORE', 'SIGN_UP', 'BOOK_NOW',
    'CONTACT_US', 'DOWNLOAD', 'GET_OFFER', 'WATCH_MORE'
  ));

-- Facebook ad copy fields — these were generated in memory by the Creative
-- Studio's AI copy path but silently dropped on save. Now persisted so the
-- launch flow can lift them straight into the ad object.
alter table saved_creatives
  add column if not exists fb_primary_text text;
alter table saved_creatives
  add column if not exists fb_headline text;
alter table saved_creatives
  add column if not exists fb_description text;

-- Thumbnail URL — was declared in the SavedCreative type but never written.
-- Populated post-save via client-triggered Puppeteer render + storage upload.
alter table saved_creatives
  add column if not exists thumbnail_url text;

-- Meta launch tracking — set once the creative is pushed to an Ad Account.
alter table saved_creatives
  add column if not exists meta_ad_id text;
alter table saved_creatives
  add column if not exists meta_ad_status text;
