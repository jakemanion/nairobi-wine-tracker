-- Allow anonymous (guest) wine error reports.
-- Guests are identified by guest_key (cookie-backed UUID); user_id stays null.

ALTER TABLE public.wine_reports
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.wine_reports
  ADD COLUMN IF NOT EXISTS guest_key text;

COMMENT ON COLUMN public.wine_reports.guest_key IS
  'Cookie-backed anonymous reporter id when user_id is null.';

ALTER TABLE public.wine_reports
  DROP CONSTRAINT IF EXISTS wine_reports_reporter_present;

ALTER TABLE public.wine_reports
  ADD CONSTRAINT wine_reports_reporter_present CHECK (
    user_id IS NOT NULL OR (guest_key IS NOT NULL AND char_length(guest_key) >= 8)
  );

CREATE INDEX IF NOT EXISTS wine_reports_guest_key_idx
  ON public.wine_reports (guest_key)
  WHERE guest_key IS NOT NULL;

-- Race-safe: one open report per guest per canonical wine
CREATE UNIQUE INDEX IF NOT EXISTS wine_reports_one_open_per_guest_wine_idx
  ON public.wine_reports (guest_key, wine_id)
  WHERE status = 'open' AND wine_id IS NOT NULL AND guest_key IS NOT NULL;
