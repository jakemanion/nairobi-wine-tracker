-- Site-wide product feedback (no email delivery).
-- Guests and logged-in users submit via server actions; admins review with service role.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.site_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  guest_key text,
  message text NOT NULL,
  contact text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  resolution_note text,
  CONSTRAINT site_feedback_status_check CHECK (status IN ('open', 'resolved')),
  CONSTRAINT site_feedback_message_length CHECK (
    char_length(message) >= 1 AND char_length(message) <= 2000
  ),
  CONSTRAINT site_feedback_contact_length CHECK (
    contact IS NULL OR char_length(contact) <= 200
  ),
  CONSTRAINT site_feedback_resolution_note_length CHECK (
    resolution_note IS NULL OR char_length(resolution_note) <= 2000
  ),
  CONSTRAINT site_feedback_open_has_no_resolution CHECK (
    status <> 'open'
    OR (resolved_at IS NULL AND resolved_by IS NULL)
  ),
  CONSTRAINT site_feedback_reporter_present CHECK (
    user_id IS NOT NULL OR (guest_key IS NOT NULL AND char_length(guest_key) >= 8)
  )
);

COMMENT ON TABLE public.site_feedback IS
  'User-submitted site feedback (message + optional contact). No outbound email.';
COMMENT ON COLUMN public.site_feedback.guest_key IS
  'Cookie-backed anonymous reporter id when user_id is null.';
COMMENT ON COLUMN public.site_feedback.contact IS
  'Optional free-text contact if the submitter wants a reply (not used for delivery).';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS site_feedback_status_created_at_idx
  ON public.site_feedback (status, created_at DESC);

CREATE INDEX IF NOT EXISTS site_feedback_created_at_idx
  ON public.site_feedback (created_at DESC);

CREATE INDEX IF NOT EXISTS site_feedback_user_id_idx
  ON public.site_feedback (user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS site_feedback_guest_key_idx
  ON public.site_feedback (guest_key)
  WHERE guest_key IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Users may insert/read their own open rows. Guests insert via service role.
-- Admins resolve/reopen/delete via service role after requireAdminAccess().
-- ---------------------------------------------------------------------------

ALTER TABLE public.site_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own site feedback" ON public.site_feedback;
CREATE POLICY "Users can read own site feedback"
ON public.site_feedback
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own open site feedback" ON public.site_feedback;
CREATE POLICY "Users can insert own open site feedback"
ON public.site_feedback
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'open'
  AND resolved_at IS NULL
  AND resolved_by IS NULL
  AND resolution_note IS NULL
);

GRANT SELECT, INSERT ON public.site_feedback TO authenticated;

-- ---------------------------------------------------------------------------
-- Down / reverse notes (manual):
-- DROP TABLE IF EXISTS public.site_feedback;
-- ---------------------------------------------------------------------------
