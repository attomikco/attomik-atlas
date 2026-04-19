-- Down-migration for 20260419_brand_images_vision_tags.sql.
--
-- The vision tagger was reverted (see commits 2f0cc879, 48a95141, 2c6946d9)
-- because the Anthropic SDK pinned to ^0.24.0 predates URL-based image
-- sources, so tagImage() silently failed for every row. Rather than bump
-- the SDK + retrofit the feature, we're backing out the column entirely
-- and relying on the existing pickSlotImages picker the landing and email
-- renderers already use.
alter table brand_images drop column if exists vision_tags;
