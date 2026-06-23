-- Multi-state tried status replaces tried + would_buy_again in UI
-- 0 = tried, 1 = tried buy again, 2 = tried don't buy again
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS tried_status smallint;

ALTER TABLE reviews
  DROP CONSTRAINT IF EXISTS reviews_tried_status_check;

ALTER TABLE reviews
  ADD CONSTRAINT reviews_tried_status_check
  CHECK (tried_status IS NULL OR tried_status IN (0, 1, 2));
