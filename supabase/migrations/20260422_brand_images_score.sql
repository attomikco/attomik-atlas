-- Persists the scanner's quality score (computed in classifyImages) so
-- Preview's creative carousel can rank the lifestyle bucket by signal
-- strength instead of DB insertion order. Legacy rows stay NULL until
-- rescraped — rankLifestyle treats NULL as sort-last within its tier.
ALTER TABLE brand_images
  ADD COLUMN IF NOT EXISTS score integer;
