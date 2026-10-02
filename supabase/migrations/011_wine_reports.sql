-- Wine error reports from authenticated users.
-- Admins review/resolve via service-role server actions after requireAdminAccess().

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wine_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wine_id uuid REFERENCES public.wines (id) ON DELETE SET NULL,
  store_listing_id uuid REFERENCES public.store_listings (id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  issue_type text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  listing_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  resolution_note text,
  CONSTRAINT wine_reports_issue_type_check CHECK (
    issue_type = ANY (
      ARRAY[
        'incorrect_price',
        'incorrect_wine_or_vintage',
        'incorrect_vivino_rating',
        'wrong_retailer_or_availability',
        'duplicate_listing',
        'incorrect_wine_information',
        'other'
      ]
    )
  ),
  CONSTRAINT wine_reports_status_check CHECK (status IN ('open', 'resolved')),
  CONSTRAINT wine_reports_description_length CHECK (
    description IS NULL OR char_length(description) <= 2000
  ),
  CONSTRAINT wine_reports_resolution_note_length CHECK (
    resolution_note IS NULL OR char_length(resolution_note) <= 2000
  ),
  CONSTRAINT wine_reports_open_has_no_resolution CHECK (
    status <> 'open'
    OR (resolved_at IS NULL AND resolved_by IS NULL)
  ),
  -- wine_id is required on insert; may become null if the wine is later deleted
  -- (snapshot retains investigative context).
  CONSTRAINT wine_reports_wine_required_when_open CHECK (
    status <> 'open' OR wine_id IS NOT NULL
  )
);

COMMENT ON TABLE public.wine_reports IS
  'User-submitted accuracy reports for canonical wines and optional store listings.';
COMMENT ON COLUMN public.wine_reports.listing_snapshot IS
  'Small JSON snapshot of wine/listing fields at submission time for investigation after edits/deletes.';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS wine_reports_status_created_at_idx
  ON public.wine_reports (status, created_at DESC);

CREATE INDEX IF NOT EXISTS wine_reports_wine_id_idx
  ON public.wine_reports (wine_id)
  WHERE wine_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS wine_reports_store_listing_id_idx
  ON public.wine_reports (store_listing_id)
  WHERE store_listing_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS wine_reports_user_id_idx
  ON public.wine_reports (user_id);

CREATE INDEX IF NOT EXISTS wine_reports_created_at_idx
  ON public.wine_reports (created_at DESC);

-- Open-report counts for admin flag indicators
CREATE INDEX IF NOT EXISTS wine_reports_open_wine_id_idx
  ON public.wine_reports (wine_id)
  WHERE status = 'open' AND wine_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS wine_reports_open_store_listing_id_idx
  ON public.wine_reports (store_listing_id)
  WHERE status = 'open' AND store_listing_id IS NOT NULL;

-- Race-safe: one open report per user per canonical wine
CREATE UNIQUE INDEX IF NOT EXISTS wine_reports_one_open_per_user_wine_idx
  ON public.wine_reports (user_id, wine_id)
  WHERE status = 'open' AND wine_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Users manage only submission of their own rows and can read their own status.
-- Resolution fields are locked down for non-admin clients (admins use service role).
-- ---------------------------------------------------------------------------

ALTER TABLE public.wine_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own wine reports" ON public.wine_reports;
CREATE POLICY "Users can read own wine reports"
ON public.wine_reports
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own open wine reports" ON public.wine_reports;
CREATE POLICY "Users can insert own open wine reports"
ON public.wine_reports
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'open'
  AND wine_id IS NOT NULL
  AND resolved_at IS NULL
  AND resolved_by IS NULL
  AND resolution_note IS NULL
);

-- No UPDATE / DELETE policies for authenticated users.
-- Admins resolve/reopen/delete via the service-role client after requireAdminAccess().

GRANT SELECT, INSERT ON public.wine_reports TO authenticated;

-- ---------------------------------------------------------------------------
-- Down / reverse notes (manual):
-- DROP TABLE IF EXISTS public.wine_reports;
-- ---------------------------------------------------------------------------
