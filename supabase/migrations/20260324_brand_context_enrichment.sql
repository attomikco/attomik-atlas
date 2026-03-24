-- Brand context enrichment migration
-- Adds structured profile fields, voice examples table, and PDF parsed text

-- 1. Add structured profile columns to brands
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS mission text,
  ADD COLUMN IF NOT EXISTS vision text,
  ADD COLUMN IF NOT EXISTS values text[],
  ADD COLUMN IF NOT EXISTS competitors jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS products jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS customer_personas jsonb DEFAULT '[]';

-- 2. Add parsed_text to brand_assets
ALTER TABLE brand_assets
  ADD COLUMN IF NOT EXISTS parsed_text text;

-- 3. Create brand_voice_examples table
CREATE TABLE IF NOT EXISTS brand_voice_examples (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz DEFAULT now(),
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('good', 'bad')),
  label text,
  content text NOT NULL,
  notes text
);

ALTER TABLE brand_voice_examples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON brand_voice_examples
  FOR ALL TO authenticated USING (true);
