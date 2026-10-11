-- Remove the FK from wines.image_source_listing_id → store_listings.
-- Keeping that FK created a second relationship between wines and store_listings,
-- which breaks PostgREST embeds (`Could not embed because more than one relationship...`).
-- The column remains for provenance; it is no longer a declared foreign key.

ALTER TABLE public.wines
  DROP CONSTRAINT IF EXISTS wines_image_source_listing_id_fkey;
