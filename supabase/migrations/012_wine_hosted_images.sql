-- Host bottle images in Supabase Storage (bucket: wine-images).
-- Canonical wines own hosted image paths. store_listings keep only the original
-- retailer image_url as the download/provenance source.

-- ---------------------------------------------------------------------------
-- Columns on wines
-- ---------------------------------------------------------------------------

ALTER TABLE public.wines
  ADD COLUMN IF NOT EXISTS hosted_image_path text,
  ADD COLUMN IF NOT EXISTS image_migration_status text,
  ADD COLUMN IF NOT EXISTS image_migration_error text,
  ADD COLUMN IF NOT EXISTS image_migrated_at timestamptz,
  -- Provenance only (no FK): a FK here creates a second PostgREST relationship
  -- between wines and store_listings and breaks embeds.
  ADD COLUMN IF NOT EXISTS image_source_listing_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'wines_image_migration_status_check'
  ) THEN
    ALTER TABLE public.wines
      ADD CONSTRAINT wines_image_migration_status_check
      CHECK (
        image_migration_status IS NULL
        OR image_migration_status IN ('pending', 'success', 'failed', 'skipped')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS wines_image_migration_pending_idx
  ON public.wines (image_migration_status, id)
  WHERE image_migration_status IS NULL
    OR image_migration_status IN ('pending', 'failed');

COMMENT ON COLUMN public.wines.hosted_image_path IS
  'Path within the wine-images storage bucket (e.g. {wine_id}/original.jpg).';
COMMENT ON COLUMN public.wines.image_migration_status IS
  'Hosted image migration: pending, success, failed, skipped.';
COMMENT ON COLUMN public.wines.image_migration_error IS
  'Last migration failure reason for manual follow-up.';
COMMENT ON COLUMN public.wines.image_migrated_at IS
  'When the wine image was last successfully migrated (or last failure recorded).';
COMMENT ON COLUMN public.wines.image_source_listing_id IS
  'store_listings row whose image_url was used as the migration source.';

-- ---------------------------------------------------------------------------
-- Storage bucket (public read; uploads via service role)
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wine-images',
  'wine-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read wine-images" ON storage.objects;
CREATE POLICY "Public read wine-images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'wine-images');
