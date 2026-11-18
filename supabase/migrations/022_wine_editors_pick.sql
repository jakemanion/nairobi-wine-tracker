-- Per-wine editorial flag for the public Editor's pick badge.

ALTER TABLE public.wines
  ADD COLUMN IF NOT EXISTS editors_pick boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.wines.editors_pick IS
  'When true, the public UI shows an Editor''s pick badge on the wine card.';
