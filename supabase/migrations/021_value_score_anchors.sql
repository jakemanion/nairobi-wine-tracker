-- Value score calibration: per-quality 5★ max price and 1★ price floors.

CREATE TABLE IF NOT EXISTS public.value_score_anchors (
  quality_rating numeric PRIMARY KEY,
  five_star_max_price integer NOT NULL,
  one_star_price integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT value_score_anchors_quality_range CHECK (
    quality_rating >= 0
    AND quality_rating <= 5
    AND (quality_rating * 4) = trunc(quality_rating * 4)
  ),
  CONSTRAINT value_score_anchors_five_positive CHECK (five_star_max_price > 0),
  CONSTRAINT value_score_anchors_one_above_five CHECK (one_star_price > five_star_max_price)
);

COMMENT ON TABLE public.value_score_anchors IS
  'Admin-editable value score calibration: quality → 5★ max price and 1★ price.';
COMMENT ON COLUMN public.value_score_anchors.quality_rating IS
  'Site quality stars 0–5 in 0.25 increments.';
COMMENT ON COLUMN public.value_score_anchors.five_star_max_price IS
  'Max KES price that still earns 5 value stars at this quality.';
COMMENT ON COLUMN public.value_score_anchors.one_star_price IS
  'KES price at which value is 1 star (higher prices score below 1★).';

INSERT INTO public.value_score_anchors (quality_rating, five_star_max_price, one_star_price) VALUES
  (3.25, 1500, 3000),
  (3.5, 2000, 3000),
  (3.75, 2250, 5000),
  (4, 2500, 5500),
  (4.25, 3000, 7000),
  (4.5, 4000, 8000),
  (4.75, 4500, 12000),
  (5, 10000, 100000)
ON CONFLICT (quality_rating) DO UPDATE
SET five_star_max_price = EXCLUDED.five_star_max_price,
    one_star_price = EXCLUDED.one_star_price,
    updated_at = now();

ALTER TABLE public.value_score_anchors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read value score anchors" ON public.value_score_anchors;
CREATE POLICY "Anyone can read value score anchors"
ON public.value_score_anchors
FOR SELECT
TO anon, authenticated
USING (true);

-- Writes are admin-only via service role (bypasses RLS).
