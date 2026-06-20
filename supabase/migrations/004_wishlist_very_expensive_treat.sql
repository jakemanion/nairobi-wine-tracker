-- Allow wishlist value 3 (very expensive treat)
ALTER TABLE reviews
  DROP CONSTRAINT IF EXISTS reviews_wishlist_check;

ALTER TABLE reviews
  ADD CONSTRAINT reviews_wishlist_check
  CHECK (wishlist IS NULL OR wishlist IN (0, 1, 2, 3));
