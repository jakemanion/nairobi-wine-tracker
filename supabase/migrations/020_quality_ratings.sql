-- Backend quality ratings: lookup table + calculated/override columns on wines.

-- ---------------------------------------------------------------------------
-- Lookup: Vivino (one-decimal key) → site star rating (0–5, 0.25 steps)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.vivino_star_lookup (
  vivino_key text PRIMARY KEY,
  star_rating numeric NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vivino_star_lookup_key_format CHECK (vivino_key ~ '^\d+\.\d$'),
  CONSTRAINT vivino_star_lookup_star_range CHECK (
    star_rating >= 0
    AND star_rating <= 5
    AND (star_rating * 4) = trunc(star_rating * 4)
  )
);

COMMENT ON TABLE public.vivino_star_lookup IS
  'Admin-editable map from Vivino rating (one decimal) to site quality stars.';
COMMENT ON COLUMN public.vivino_star_lookup.vivino_key IS
  'Vivino rating rounded to one decimal, e.g. 3.5';
COMMENT ON COLUMN public.vivino_star_lookup.star_rating IS
  'Site quality stars 0–5 in 0.25 increments.';

INSERT INTO public.vivino_star_lookup (vivino_key, star_rating) VALUES
  ('3.0', 0),
  ('3.1', 0.25),
  ('3.2', 0.5),
  ('3.3', 1),
  ('3.4', 2),
  ('3.5', 3),
  ('3.6', 3.25),
  ('3.7', 3.5),
  ('3.8', 3.75),
  ('3.9', 4),
  ('4.0', 4.25),
  ('4.1', 4.5),
  ('4.2', 4.75),
  ('4.3', 5),
  ('4.4', 5),
  ('4.5', 5),
  ('4.6', 5),
  ('4.7', 5),
  ('4.8', 5),
  ('4.9', 5),
  ('5.0', 5)
ON CONFLICT (vivino_key) DO UPDATE
SET star_rating = EXCLUDED.star_rating,
    updated_at = now();

ALTER TABLE public.vivino_star_lookup ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read vivino star lookup" ON public.vivino_star_lookup;
CREATE POLICY "Anyone can read vivino star lookup"
ON public.vivino_star_lookup
FOR SELECT
TO anon, authenticated
USING (true);

-- Writes are admin-only via service role (bypasses RLS).

-- ---------------------------------------------------------------------------
-- Wine columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.wines
  ADD COLUMN IF NOT EXISTS quality_rating numeric NULL;

ALTER TABLE public.wines
  ADD COLUMN IF NOT EXISTS quality_rating_override numeric NULL;

ALTER TABLE public.wines
  DROP CONSTRAINT IF EXISTS wines_quality_rating_range;
ALTER TABLE public.wines
  ADD CONSTRAINT wines_quality_rating_range CHECK (
    quality_rating IS NULL
    OR (
      quality_rating >= 0
      AND quality_rating <= 5
      AND (quality_rating * 4) = trunc(quality_rating * 4)
    )
  );

ALTER TABLE public.wines
  DROP CONSTRAINT IF EXISTS wines_quality_rating_override_range;
ALTER TABLE public.wines
  ADD CONSTRAINT wines_quality_rating_override_range CHECK (
    quality_rating_override IS NULL
    OR (
      quality_rating_override >= 0
      AND quality_rating_override <= 5
      AND (quality_rating_override * 4) = trunc(quality_rating_override * 4)
    )
  );

COMMENT ON COLUMN public.wines.quality_rating IS
  'Lookup-derived site quality stars from vivino_rating. Recomputed when Vivino or the lookup table changes.';
COMMENT ON COLUMN public.wines.quality_rating_override IS
  'Optional admin override of quality stars. When set, site uses this instead of quality_rating.';

-- ---------------------------------------------------------------------------
-- Backfill calculated quality_rating from existing vivino_rating + lookup
-- ---------------------------------------------------------------------------

UPDATE public.wines w
SET quality_rating = CASE
  WHEN w.vivino_rating IS NULL OR btrim(w.vivino_rating::text) = '' THEN NULL
  WHEN NOT (w.vivino_rating::text ~ '^-?[0-9]+(\.[0-9]+)?$') THEN NULL
  WHEN (w.vivino_rating::numeric) <= 3 THEN 0
  ELSE COALESCE(
    (
      SELECT l.star_rating
      FROM public.vivino_star_lookup l
      WHERE l.vivino_key = to_char(round(w.vivino_rating::numeric, 1), 'FM999990.0')
    ),
    CASE
      WHEN (w.vivino_rating::numeric) >= 4.3 THEN 5
      ELSE 0
    END
  )
END
WHERE w.quality_rating IS NULL
  AND w.vivino_rating IS NOT NULL
  AND btrim(w.vivino_rating::text) <> '';
