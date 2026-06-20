-- Multi-state wishlist replaces want_to_try for new UI (0 = don't want, 1 = want, 2 = expensive treat)
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS wishlist smallint;

ALTER TABLE reviews
  DROP CONSTRAINT IF EXISTS reviews_wishlist_check;

ALTER TABLE reviews
  ADD CONSTRAINT reviews_wishlist_check
  CHECK (wishlist IS NULL OR wishlist IN (0, 1, 2));
