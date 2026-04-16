-- Cache AI-generated landing page HTML on generated_content rows.
-- generated_html holds the full HTML document Claude returned.
-- generated_html_hash is a sha256 of the exact prompt inputs that produced it,
-- so routes can detect when cached HTML is stale (brief/brand/overrides changed).

alter table generated_content
  add column if not exists generated_html text,
  add column if not exists generated_html_hash text;
