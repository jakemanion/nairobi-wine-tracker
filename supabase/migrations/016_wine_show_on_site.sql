-- Rename show_hosted_image → show_on_site: controls whether the wine appears
-- on the public frontend (not which image URL is used).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'wines'
      AND column_name = 'show_hosted_image'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'wines'
      AND column_name = 'show_on_site'
  ) THEN
    ALTER TABLE public.wines RENAME COLUMN show_hosted_image TO show_on_site;
  END IF;
END $$;

ALTER TABLE public.wines
  ADD COLUMN IF NOT EXISTS show_on_site boolean NOT NULL DEFAULT false;

-- Keep currently verified catalogue wines visible after the meaning change.
UPDATE public.wines
SET show_on_site = true
WHERE vivino_match_confidence = 100
  AND show_on_site = false;

COMMENT ON COLUMN public.wines.show_on_site IS
  'When true, the wine may appear on the public frontend (still subject to other filters such as vivino_match_confidence). When false, it is admin-only.';
